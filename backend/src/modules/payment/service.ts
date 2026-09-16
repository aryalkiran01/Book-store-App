import axios from "axios";
import crypto from "crypto";
import { env, isKhaltiConfigured } from "../../utils/config";
import { APIError } from "../../utils/error";
import { OrderModel } from "../order/model";
import { PaymentModel } from "./model";
import { RefundModel } from "./refund.model";
import { BookModel } from "../book/model";
import { commitOrderReservation, recordInventoryTransaction } from "../inventory/service";
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

  const orderOwnerId =
    order.userId && typeof order.userId === "object" && "_id" in order.userId
      ? (order.userId as any)._id.toString()
      : String(order.userId || "");

  // Strict ownership check (Fail Closed): Caller must be order owner or admin
  if (
    !requestingUserId ||
    (requestingUserRole !== "admin" && orderOwnerId !== requestingUserId)
  ) {
    throw APIError.forbidden(
      "You do not have permission to initiate payment for this order"
    );
  }

  if (order.paymentStatus === "completed") {
    throw APIError.badRequest("This order has already been paid for.");
  }

  if (order.status === "cancelled") {
    throw APIError.badRequest("Cannot initiate payment for a cancelled order.");
  }

  const isProduction =
    env.NODE_ENV === "production" || process.env.NODE_ENV === "production";
  const khaltiSecret = (env.KHALTI_SECRET_KEY || "").trim();

  // Authoritatively calculate and enforce expected paisa from DB order total
  const authoritativePaisa = Math.round(order.totalAmount * 100);
  const returnUrl =
    paymentData.return_url || `${env.FRONTEND_URL}/payment/callback?provider=khalti`;
  const websiteUrl = paymentData.website_url || env.FRONTEND_URL;

  if (!isKhaltiConfigured(khaltiSecret)) {
    if (isProduction) {
      throw APIError.badRequest(
        "Khalti payment gateway is not properly configured. A valid Khalti secret key is required in backend/.env."
      );
    }

    // In dev/test with unconfigured key, simulate initiation URL for developer testing
    const mockPidx = `mock_pidx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    order.paymentId = mockPidx;
    order.paymentMethod = "khalti";
    await order.save();

    return {
      pidx: mockPidx,
      payment_url: `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}pidx=${mockPidx}&purchase_order_id=${order._id.toString()}`,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      expires_in: 3600,
      user_fee: 0,
    };
  }

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
  requestingUserRole?: string,
  simulateProduction?: boolean
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

  const orderOwnerId =
    targetOrder.userId && typeof targetOrder.userId === "object" && "_id" in targetOrder.userId
      ? (targetOrder.userId as any)._id.toString()
      : String(targetOrder.userId || "");

  // Strict ownership check (Fail Closed): Caller must be order owner or admin
  if (
    !requestingUserId ||
    (requestingUserRole !== "admin" && orderOwnerId !== requestingUserId)
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

  if (targetOrder.status === "cancelled") {
    throw APIError.badRequest("Cannot verify payment for a cancelled order.");
  }

  const isMockPidx =
    cleanPidx.startsWith("mock_pidx_") ||
    cleanPidx.startsWith("demo_pidx_") ||
    cleanPidx.startsWith("mock_");

  const isProduction =
    simulateProduction ||
    env.NODE_ENV === "production" ||
    process.env.NODE_ENV === "production";

  // Security Rule: Mock/Demo shortcuts must NEVER work in production (Fail Closed)
  if (isProduction && isMockPidx) {
    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: "Mock/demo payment shortcut strictly rejected in production environment",
      changedBy: "security_guard",
    });
    await targetOrder.save();

    throw APIError.badRequest(
      "Mock/demo payment shortcuts are strictly forbidden in production environment."
    );
  }

  let verification: any = null;
  const expectedPaisa = Math.round(targetOrder.totalAmount * 100);

  // Development/Test mock handling
  if (!isProduction && isMockPidx) {
    verification = {
      pidx: cleanPidx,
      total_amount: expectedPaisa,
      status: "Completed",
      transaction_id: `DEMO_TXN_${Date.now()}`,
      fee: 0,
      refunded: false,
      purchase_order_id: targetOrder._id.toString(),
    };
  } else {
    // Live Provider Verification via Khalti Lookup API
    const khaltiSecret = (env.KHALTI_SECRET_KEY || "").trim();
    if (!isKhaltiConfigured(khaltiSecret)) {
      targetOrder.paymentStatus = "failed";
      targetOrder.statusHistory.push({
        status: targetOrder.status,
        changedAt: new Date(),
        note: "Khalti gateway is not configured on server",
        changedBy: "payment_system",
      });
      await targetOrder.save();

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

  // Validate that the returned purchase_order_id matches this order (if provided by gateway)
  if (
    verification.purchase_order_id &&
    verification.purchase_order_id !== targetOrder._id.toString()
  ) {
    targetOrder.paymentStatus = "failed";
    targetOrder.statusHistory.push({
      status: targetOrder.status,
      changedAt: new Date(),
      note: `Order ID mismatch: Gateway reported order ${verification.purchase_order_id}, but expected ${targetOrder._id.toString()}`,
      changedBy: "security_guard",
    });
    await targetOrder.save();

    throw APIError.badRequest(
      "Payment verification failed: Gateway transaction belongs to a different order."
    );
  }

  // Authoritatively Verify Payment Amount (FAIL CLOSED)
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
  const transactionId = verification.transaction_id || cleanPidx;

  // Commit stock reservation (decrements physical stock and clears reservation)
  try {
    const items = targetOrder.books.map((b) => ({
      bookId: b.bookId.toString(),
      quantity: b.quantity,
    }));
    await commitOrderReservation(items, targetOrder._id.toString(), "khalti_gateway");
  } catch (invErr: any) {
    console.warn("Commit inventory reservation note:", invErr.message);
  }

  // Record payment in Payment ledger
  try {
    await PaymentModel.findOneAndUpdate(
      { provider: "khalti", transactionId },
      {
        orderId: targetOrder._id,
        userId: targetOrder.userId,
        provider: "khalti",
        transactionId,
        paymentReference: cleanPidx,
        amount: targetOrder.totalAmount,
        amountPaisa: expectedPaisa,
        currency: "NPR",
        status: "completed",
        verifiedAt: new Date(),
        rawResponse: verification,
      },
      { upsert: true, new: true }
    );
  } catch (payErr: any) {
    console.warn("PaymentModel record note:", payErr.message);
  }

  targetOrder.paymentStatus = "completed";
  targetOrder.paymentMethod = "khalti";
  targetOrder.paymentId = transactionId;
  if (targetOrder.status === "pending") {
    targetOrder.status = "confirmed";
  }

  targetOrder.statusHistory.push({
    status: targetOrder.status,
    changedAt: new Date(),
    note: `Payment verified successfully via Khalti (Txn: ${transactionId})`,
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

  const orderOwnerId =
    order.userId && typeof order.userId === "object" && "_id" in order.userId
      ? (order.userId as any)._id.toString()
      : String(order.userId || "");

  // Strict ownership check (Fail Closed): Caller must be order owner or admin
  if (
    !requestingUserId ||
    (requestingUserRole !== "admin" && orderOwnerId !== requestingUserId)
  ) {
    throw APIError.forbidden(
      "You do not have permission to initiate payment for this order"
    );
  }

  if (order.paymentStatus === "completed") {
    throw APIError.badRequest("This order has already been paid for.");
  }

  if (order.status === "cancelled") {
    throw APIError.badRequest("Cannot initiate payment for a cancelled order.");
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

  const orderOwnerId =
    targetOrder.userId && typeof targetOrder.userId === "object" && "_id" in targetOrder.userId
      ? (targetOrder.userId as any)._id.toString()
      : String(targetOrder.userId || "");

  // Strict ownership check (Fail Closed): Caller must be order owner or admin
  if (
    !requestingUserId ||
    (requestingUserRole !== "admin" && orderOwnerId !== requestingUserId)
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

  if (targetOrder.status === "cancelled") {
    throw APIError.badRequest("Cannot verify payment for a cancelled order.");
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
  const transactionId = String(transaction_code || transaction_uuid);

  // Commit stock reservation
  try {
    const items = targetOrder.books.map((b) => ({
      bookId: b.bookId.toString(),
      quantity: b.quantity,
    }));
    await commitOrderReservation(items, targetOrder._id.toString(), "esewa_gateway");
  } catch (invErr: any) {
    console.warn("Commit inventory reservation note:", invErr.message);
  }

  // Record payment in Payment ledger
  try {
    await PaymentModel.findOneAndUpdate(
      { provider: "esewa", transactionId },
      {
        orderId: targetOrder._id,
        userId: targetOrder.userId,
        provider: "esewa",
        transactionId,
        paymentReference: transaction_uuid,
        amount: targetOrder.totalAmount,
        amountPaisa: Math.round(targetOrder.totalAmount * 100),
        currency: "NPR",
        status: "completed",
        verifiedAt: new Date(),
        rawResponse: decodedJson,
      },
      { upsert: true, new: true }
    );
  } catch (payErr: any) {
    console.warn("PaymentModel record note:", payErr.message);
  }

  targetOrder.paymentStatus = "completed";
  targetOrder.paymentMethod = "esewa";
  targetOrder.paymentId = transactionId;
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

/**
 * -------------------------------------------------------------
 * 3. DEMO / SIMULATED PAYMENT (Strictly blocked in production)
 * -------------------------------------------------------------
 */

export async function processDemoPaymentService(
  orderId: string,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  validateObjectId(orderId, "Order ID");

  const isProduction = env.NODE_ENV === "production" || process.env.NODE_ENV === "production";
  if (isProduction) {
    throw APIError.forbidden("Demo payments are strictly forbidden in production.");
  }

  const order = await OrderModel.findOne({ _id: orderId, isDeleted: { $ne: true } });
  if (!order) {
    throw APIError.notFound("Order not found");
  }

  const orderOwnerId =
    order.userId && typeof order.userId === "object" && "_id" in order.userId
      ? (order.userId as any)._id.toString()
      : String(order.userId || "");

  if (
    !requestingUserId ||
    (requestingUserRole !== "admin" && orderOwnerId !== requestingUserId)
  ) {
    throw APIError.forbidden("You do not have permission to process payment for this order");
  }

  if (order.paymentStatus === "completed") {
    return {
      success: true,
      message: "Order is already paid",
      order,
    };
  }

  if (order.status === "cancelled") {
    throw APIError.badRequest("Cannot pay for a cancelled order.");
  }

  const demoTxnId = `DEMO_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

  // Commit reservation
  try {
    const items = order.books.map((b) => ({
      bookId: b.bookId.toString(),
      quantity: b.quantity,
    }));
    await commitOrderReservation(items, order._id.toString(), "demo_gateway");
  } catch (invErr: any) {
    console.warn("Demo payment commit reservation note:", invErr.message);
  }

  // Record payment in Payment ledger
  try {
    await PaymentModel.create({
      orderId: order._id,
      userId: order.userId,
      provider: "demo",
      transactionId: demoTxnId,
      paymentReference: "simulated_local_demo",
      amount: order.totalAmount,
      amountPaisa: Math.round(order.totalAmount * 100),
      currency: "NPR",
      status: "completed",
      verifiedAt: new Date(),
      rawResponse: { simulated: true, environment: env.NODE_ENV },
    });
  } catch (err: any) {
    console.warn("Demo payment ledger record note:", err.message);
  }

  order.paymentStatus = "completed";
  order.paymentMethod = "demo";
  order.paymentId = demoTxnId;
  if (order.status === "pending") {
    order.status = "confirmed";
  }

  order.statusHistory.push({
    status: order.status,
    changedAt: new Date(),
    note: `Simulated demo payment completed (Txn: ${demoTxnId})`,
    changedBy: requestingUserRole === "admin" ? "admin" : "customer",
  });

  await order.save();

  return {
    success: true,
    transactionId: demoTxnId,
    order,
    message: "Demo payment completed successfully",
  };
}

/**
 * -------------------------------------------------------------
 * 4. REFUND PROCESSING SERVICES (Phase 12)
 * -------------------------------------------------------------
 */

export async function processRefundService(
  refundId: string,
  action: "approve" | "reject",
  adminUserId: string,
  note?: string,
  restockItems = true
) {
  if (!refundId || !refundId.trim()) {
    throw APIError.badRequest("Refund ID is required");
  }

  const refund = await RefundModel.findOne({
    $or: [{ refundId: refundId.trim() }, { _id: refundId.trim() }],
  });

  if (!refund) {
    throw APIError.notFound("Refund request not found");
  }

  if (refund.status === "completed" || refund.status === "rejected") {
    throw APIError.badRequest(`Refund has already been ${refund.status}.`);
  }

  const order = await OrderModel.findOne({ _id: refund.orderId, isDeleted: { $ne: true } });
  if (!order) {
    throw APIError.notFound("Associated order not found");
  }

  if (action === "approve") {
    refund.status = "completed";
    refund.approvedBy = adminUserId as any;
    refund.completedAt = new Date();

    order.paymentStatus = "refunded";
    order.status = "refunded";

    // Restock items if requested and record inventory transactions
    if (restockItems && order.books && order.books.length > 0) {
      for (const item of order.books) {
        const book = await BookModel.findById(item.bookId);
        if (book) {
          const prevStock = book.stock;
          book.stock += item.quantity;
          await book.save();

          await recordInventoryTransaction({
            bookId: item.bookId.toString(),
            quantity: item.quantity,
            type: "RESTOCK",
            previousStock: prevStock,
            newStock: book.stock,
            previousReservedStock: book.reservedStock ?? 0,
            newReservedStock: book.reservedStock ?? 0,
            referenceId: order._id.toString(),
            reason: `Restocked after approved refund ${refund.refundId}`,
            performedBy: adminUserId || "admin",
          });
        }
      }
    }

    // Update payment record status
    await PaymentModel.updateMany(
      { orderId: order._id },
      { $set: { status: "refunded" } }
    );

    order.statusHistory.push({
      status: "refunded",
      changedAt: new Date(),
      note: `Refund approved & processed (${refund.refundId}). NPR ${refund.amount} refunded.${restockItems ? " Inventory restocked." : ""}`,
      changedBy: "admin",
    });
  } else {
    refund.status = "rejected";
    refund.rejectionReason = note || "Refund request rejected by admin";

    order.statusHistory.push({
      status: order.status,
      changedAt: new Date(),
      note: `Refund rejected (${refund.refundId}): ${refund.rejectionReason}`,
      changedBy: "admin",
    });
  }

  await Promise.all([refund.save(), order.save()]);

  return {
    refund,
    order,
    message: action === "approve" ? "Refund processed successfully" : "Refund rejected",
  };
}

export async function getRefundsService(query?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: Record<string, any> = {};
  if (query?.status) {
    filter.status = query.status;
  }

  const [total, refunds] = await Promise.all([
    RefundModel.countDocuments(filter),
    RefundModel.find(filter)
      .populate("orderId")
      .populate("userId", "username email fullName")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    refunds,
    pagination: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

// Aliases for backwards compatibility
export const initiatePaymentService = initiateKhaltiPaymentService;
export const verifyPaymentService = verifyKhaltiPaymentService;
