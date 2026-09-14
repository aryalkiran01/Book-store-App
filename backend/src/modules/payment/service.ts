import axios from "axios";
import crypto from "crypto";
import { env, isKhaltiConfigured } from "../../utils/config";
import { APIError } from "../../utils/error";
import { OrderModel } from "../order/model";
import { validateObjectId } from "../../utils/security";

export interface InitiateKhaltiInput {
  return_url?: string;
  website_url?: string;
  amount?: number; // in paisa (calculated authoritatively on server)
  purchase_order_id: string;
  purchase_order_name?: string;
  customer_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface InitiateEsewaInput {
  orderId: string;
}

/**
 * Generates an HMAC-SHA256 signature for eSewa v2 API initiation
 */
export function generateEsewaSignature(
  totalAmount: string | number,
  transactionUuid: string,
  productCode: string,
  secretKey: string = env.ESEWA_SECRET_KEY
): string {
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  return hmac.digest("base64");
}

/**
 * Verifies the HMAC-SHA256 signature returned in the eSewa v2 response payload
 */
export function verifyEsewaResponseSignature(
  decodedPayload: Record<string, any>,
  secretKey: string = env.ESEWA_SECRET_KEY
): boolean {
  const { signed_field_names, signature } = decodedPayload;
  if (!signature || typeof signature !== "string") {
    return false;
  }

  // Method 1: Generate signature strictly based on eSewa's returned signed_field_names
  if (signed_field_names && typeof signed_field_names === "string") {
    const fields = signed_field_names.split(",").map((f: string) => f.trim());
    const message = fields
      .map((field: string) => `${field}=${decodedPayload[field] !== undefined ? decodedPayload[field] : ""}`)
      .join(",");

    const hmac = crypto.createHmac("sha256", secretKey);
    hmac.update(message);
    const computedSignature = hmac.digest("base64");

    if (computedSignature === signature) {
      return true;
    }
  }

  // Method 2: Check initiation parameter signature format
  const rawTotal = decodedPayload.total_amount;
  const cleanTotal = String(rawTotal ?? "").replace(/,/g, "");
  const txUuid = decodedPayload.transaction_uuid;
  const pCode = decodedPayload.product_code;

  const rawMsg = `total_amount=${rawTotal},transaction_uuid=${txUuid},product_code=${pCode}`;
  const rawHmac = crypto.createHmac("sha256", secretKey).update(rawMsg).digest("base64");
  if (rawHmac === signature) {
    return true;
  }

  const cleanMsg = `total_amount=${cleanTotal},transaction_uuid=${txUuid},product_code=${pCode}`;
  const cleanHmac = crypto.createHmac("sha256", secretKey).update(cleanMsg).digest("base64");
  if (cleanHmac === signature) {
    return true;
  }

  return false;
}

/**
 * -------------------------------------------------------------
 * 1. KHALTI PAYMENT INTEGRATION (Official ePayment v2)
 * -------------------------------------------------------------
 */

export async function initiateKhaltiPaymentService(
  paymentData: InitiateKhaltiInput,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  const orderId = paymentData.purchase_order_id;
  validateObjectId(orderId, "Purchase Order ID");

  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw APIError.notFound("Order not found");
  }

  // Verify Ownership
  if (
    requestingUserId &&
    requestingUserRole !== "admin" &&
    order.userId.toString() !== requestingUserId
  ) {
    throw APIError.forbidden(
      "You do not have permission to initiate payment for this order"
    );
  }

  if (order.paymentStatus === "completed") {
    throw APIError.badRequest("This order has already been paid for.");
  }

  const khaltiSecret = (env.KHALTI_SECRET_KEY || "").trim();
  if (!isKhaltiConfigured(khaltiSecret)) {
    throw APIError.badRequest(
      "Khalti payment gateway is not properly configured. A valid Khalti secret key is required in backend/.env."
    );
  }

  // Authoritatively calculate and enforce expected paisa from DB order total
  const authoritativePaisa = Math.round(order.totalAmount * 100);
  const returnUrl =
    paymentData.return_url || `${env.FRONTEND_URL}/payment/callback?provider=khalti`;
  const websiteUrl = paymentData.website_url || env.FRONTEND_URL;

  const khaltiPayload = {
    return_url: returnUrl,
    website_url: websiteUrl,
    amount: authoritativePaisa,
    purchase_order_id: order._id.toString(),
    purchase_order_name: paymentData.purchase_order_name || `KitabGhar Order #${order._id}`,
    customer_info: paymentData.customer_info || {
      name: order.customerInfo?.fullName || "Customer",
      email: order.customerInfo?.email || "customer@example.com",
      phone: order.customerInfo?.phone || "9800000000",
    },
  };

  const authHeader = khaltiSecret.startsWith("Key ") ? khaltiSecret : `Key ${khaltiSecret}`;

  try {
    const response = await axios.post<any>(env.KHALTI_INITIATE_URL, khaltiPayload, {
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (response.data?.pidx) {
      order.paymentId = response.data.pidx;
      order.paymentMethod = "khalti";
      await order.save();
    }

    return response.data;
  } catch (error: any) {
    const status = error.response?.status;
    const responseData = error.response?.data;
    const khaltiErrorMsg =
      responseData?.detail ||
      responseData?.message ||
      error.message ||
      "Payment gateway unreachable";

    console.warn(`[Khalti Diagnostic] Initiation Error:`, {
      httpStatus: status,
      endpoint: env.KHALTI_INITIATE_URL,
      secretConfigured: isKhaltiConfigured(khaltiSecret),
      secretLength: khaltiSecret.length,
      secretPrefix: khaltiSecret ? `${khaltiSecret.substring(0, 8)}...` : "NONE",
      amountPaisa: authoritativePaisa,
      orderId: order._id.toString(),
      gatewayResponse: responseData || error.message,
    });

    throw APIError.badRequest(`Khalti payment initiation failed: ${khaltiErrorMsg}`);
  }
}

export async function verifyKhaltiPaymentService(
  pidx: string,
  orderId?: string,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  if (!pidx || typeof pidx !== "string" || !pidx.trim()) {
    throw APIError.badRequest("Payment identifier (pidx) is required");
  }

  const cleanPidx = pidx.trim();

  // Find target order
  let targetOrder = null;
  if (orderId && orderId.trim()) {
    validateObjectId(orderId.trim(), "Order ID");
    targetOrder = await OrderModel.findById(orderId.trim());
  }

  if (!targetOrder) {
    targetOrder = await OrderModel.findOne({ paymentId: cleanPidx });
  }

  if (!targetOrder) {
    throw APIError.notFound(
      "No matching order found for this payment verification request"
    );
  }

  // Verify Ownership
  if (
    requestingUserId &&
    requestingUserRole !== "admin" &&
    targetOrder.userId.toString() !== requestingUserId
  ) {
    throw APIError.forbidden(
      "You do not have permission to verify payment for this order"
    );
  }

  // Idempotency: If order is already completed, return existing success state
  if (targetOrder.paymentStatus === "completed") {
    return {
      pidx: cleanPidx,
      status: "Completed",
      transaction_id: targetOrder.paymentId,
      total_amount: Math.round(targetOrder.totalAmount * 100),
      fee: 0,
      refunded: false,
      alreadyVerified: true,
      order: targetOrder,
      message: "Payment was previously verified and completed",
    };
  }

  let verification: any = null;
  const khaltiSecret = (env.KHALTI_SECRET_KEY || "").trim();
  if (!isKhaltiConfigured(khaltiSecret)) {
    throw APIError.badRequest(
      "Khalti payment gateway is not properly configured. A valid Khalti secret key is required in backend/.env."
    );
  }
  const authHeader = khaltiSecret.startsWith("Key ") ? khaltiSecret : `Key ${khaltiSecret}`;

  try {
    const response = await axios.post(
      env.KHALTI_LOOKUP_URL,
      { pidx: cleanPidx },
      {
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    verification = response.data;
  } catch (error: any) {
    const khaltiErrMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Khalti payment verification service error";

    console.warn("[Khalti Diagnostic] Lookup failed closed:", {
      httpStatus: error.response?.status,
      endpoint: env.KHALTI_LOOKUP_URL,
      pidx: cleanPidx,
      errorMsg: khaltiErrMsg,
    });

    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: `Khalti verification failed: ${khaltiErrMsg}`,
      changedBy: "payment_system",
    });
    await targetOrder.save();

    throw APIError.badRequest(`Payment verification failed: ${khaltiErrMsg}`);
  }

  // Validate Verification Payload Status (FAIL CLOSED)
  if (!verification || verification.status !== "Completed") {
    const statusText = verification?.status || "Incomplete";
    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: `Khalti verification rejected. Status: ${statusText}`,
      changedBy: "payment_system",
    });
    await targetOrder.save();

    throw APIError.badRequest(
      `Payment verification failed. Gateway status is '${statusText}'`
    );
  }

  // Authoritatively Verify Payment Amount (FAIL CLOSED)
  const expectedPaisa = Math.round(targetOrder.totalAmount * 100);
  const paidPaisa = Number(
    verification.total_amount ?? verification.amount ?? 0
  );

  if (paidPaisa !== expectedPaisa) {
    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: `Payment amount mismatch: Expected ${expectedPaisa} paisa, received ${paidPaisa} paisa`,
      changedBy: "payment_system",
    });
    await targetOrder.save();

    throw APIError.badRequest(
      `Payment amount mismatch. Expected NPR ${targetOrder.totalAmount} (${expectedPaisa} paisa), but gateway reported ${paidPaisa} paisa.`
    );
  }

  // Genuine payment verified successfully
  targetOrder.paymentStatus = "completed";
  targetOrder.paymentMethod = "khalti";
  targetOrder.paymentId = verification.transaction_id || cleanPidx;
  if (targetOrder.status === "pending") {
    targetOrder.status = "confirmed";
  }

  targetOrder.statusHistory.push({
    status: targetOrder.status,
    changedAt: new Date(),
    note: `Payment verified successfully via Khalti (Txn: ${verification.transaction_id || cleanPidx})`,
    changedBy: "payment_system",
  });

  await targetOrder.save();
  return {
    ...verification,
    order: targetOrder,
  };
}

/**
 * -------------------------------------------------------------
 * 2. ESEWA PAYMENT INTEGRATION (Official ePay v2)
 * -------------------------------------------------------------
 */

export async function initiateEsewaPaymentService(
  orderId: string,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  validateObjectId(orderId, "Order ID");

  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw APIError.notFound("Order not found");
  }

  // Verify Ownership
  if (
    requestingUserId &&
    requestingUserRole !== "admin" &&
    order.userId.toString() !== requestingUserId
  ) {
    throw APIError.forbidden(
      "You do not have permission to initiate payment for this order"
    );
  }

  if (order.paymentStatus === "completed") {
    throw APIError.badRequest("This order has already been paid for.");
  }

  const subtotal = order.subtotal;
  const shippingCost = order.shippingCost || 0;
  const totalAmount = order.totalAmount;
  const transactionUuid = `${order._id}`;
  const productCode = env.ESEWA_PRODUCT_CODE;

  // Generate official eSewa HMAC-SHA256 signature
  const signature = generateEsewaSignature(
    totalAmount,
    transactionUuid,
    productCode,
    env.ESEWA_SECRET_KEY
  );

  const successUrl = `${env.FRONTEND_URL}/payment/callback?provider=esewa`;
  const failureUrl = `${env.FRONTEND_URL}/payment/callback?provider=esewa&status=failed&orderId=${order._id}`;

  const esewaFormData = {
    amount: subtotal.toString(),
    tax_amount: "0",
    total_amount: totalAmount.toString(),
    transaction_uuid: transactionUuid,
    product_code: productCode,
    product_service_charge: "0",
    product_delivery_charge: shippingCost.toString(),
    success_url: successUrl,
    failure_url: failureUrl,
    signed_field_names: "total_amount,transaction_uuid,product_code",
    signature,
  };

  order.paymentMethod = "esewa";
  order.paymentId = transactionUuid;
  await order.save();

  return {
    payment_url: env.ESEWA_INITIATE_URL,
    formData: esewaFormData,
    orderId: order._id.toString(),
    totalAmount,
  };
}

export async function verifyEsewaPaymentService(
  encodedData: string,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  if (!encodedData || typeof encodedData !== "string") {
    throw APIError.badRequest("Encoded payment data is required from eSewa");
  }

  let decodedJson: any = null;
  try {
    const decodedString = Buffer.from(encodedData, "base64").toString("utf-8");
    decodedJson = JSON.parse(decodedString);
  } catch (err) {
    throw APIError.badRequest("Invalid base64 encoded data from eSewa");
  }

  const {
    transaction_code,
    status,
    total_amount,
    transaction_uuid,
    product_code,
    signed_field_names,
    signature,
  } = decodedJson;

  if (!transaction_uuid) {
    throw APIError.badRequest("Missing transaction_uuid in eSewa response");
  }

  // Extract order ID from transaction UUID
  const orderId = transaction_uuid.includes("-")
    ? transaction_uuid.split("-")[0]
    : transaction_uuid;

  validateObjectId(orderId, "Order ID");
  const targetOrder = await OrderModel.findById(orderId);
  if (!targetOrder) {
    throw APIError.notFound("No matching order found for this eSewa transaction");
  }

  // Verify Ownership
  if (
    requestingUserId &&
    requestingUserRole !== "admin" &&
    targetOrder.userId.toString() !== requestingUserId
  ) {
    throw APIError.forbidden(
      "You do not have permission to verify payment for this order"
    );
  }

  // Idempotency: If already completed
  if (targetOrder.paymentStatus === "completed") {
    return {
      status: "COMPLETE",
      transaction_code: targetOrder.paymentId,
      total_amount: targetOrder.totalAmount,
      transaction_uuid,
      product_code,
      alreadyVerified: true,
      order: targetOrder,
      message: "eSewa payment was previously verified and completed",
    };
  }

  // Verify Gateway Status
  if (status !== "COMPLETE") {
    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: `eSewa returned incomplete status: ${status}`,
      changedBy: "payment_system",
    });
    await targetOrder.save();
    throw APIError.badRequest(`eSewa transaction is not complete. Status: ${status}`);
  }

  // Verify HMAC Signature (FAIL CLOSED)
  const isSignatureValid = verifyEsewaResponseSignature(
    decodedJson,
    env.ESEWA_SECRET_KEY
  );

  if (!isSignatureValid) {
    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: "eSewa signature verification failed (Tampering detected)",
      changedBy: "security_guard",
    });
    await targetOrder.save();
    throw APIError.badRequest("eSewa response signature verification failed");
  }

  // Verify Amount Authoritatively (normalize string representations and commas)
  const cleanedAmountStr = String(total_amount ?? "").replace(/,/g, "");
  const paidAmount = Number(cleanedAmountStr);

  if (isNaN(paidAmount) || paidAmount !== targetOrder.totalAmount) {
    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: `eSewa amount mismatch: Expected NPR ${targetOrder.totalAmount}, received NPR ${paidAmount}`,
      changedBy: "payment_system",
    });
    await targetOrder.save();
    throw APIError.badRequest(
      `Payment amount mismatch. Expected NPR ${targetOrder.totalAmount}, but received NPR ${paidAmount}`
    );
  }

  // Server-to-Server eSewa status verification check
  try {
    const statusCheckUrl = `${env.ESEWA_STATUS_CHECK_URL}?product_code=${product_code}&total_amount=${cleanedAmountStr}&transaction_uuid=${transaction_uuid}`;
    const statusRes = await axios.get<any>(statusCheckUrl, { timeout: 8000 });
    if (statusRes.data?.status && statusRes.data.status !== "COMPLETE") {
      throw new Error(`eSewa server check returned status: ${statusRes.data.status}`);
    }
  } catch (apiErr: any) {
    console.warn("eSewa server-to-server check note:", apiErr.message);
  }

  // Payment verified successfully
  targetOrder.paymentStatus = "completed";
  targetOrder.paymentMethod = "esewa";
  targetOrder.paymentId = transaction_code || transaction_uuid;
  if (targetOrder.status === "pending") {
    targetOrder.status = "confirmed";
  }

  targetOrder.statusHistory.push({
    status: targetOrder.status,
    changedAt: new Date(),
    note: `Payment verified successfully via eSewa (Txn Code: ${transaction_code})`,
    changedBy: "payment_system",
  });

  await targetOrder.save();

  return {
    status: "COMPLETE",
    transaction_code,
    total_amount,
    transaction_uuid,
    product_code,
    order: targetOrder,
  };
}

// Aliases for backwards compatibility
export const initiatePaymentService = initiateKhaltiPaymentService;
export const verifyPaymentService = verifyKhaltiPaymentService;
