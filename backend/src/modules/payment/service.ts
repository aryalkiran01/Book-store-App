import axios from "axios";
import { env } from "../../utils/config";
import { APIError } from "../../utils/error";
import { OrderModel } from "../order/model";
import { validateObjectId } from "../../utils/security";

const KHALTI_API_KEY = env.KHALTI_API_KEY;
const KHALTI_INITIATE_URL =
  "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://a.khalti.com/api/v2/epayment/lookup/";

export interface InitiatePaymentInput {
  return_url: string;
  website_url: string;
  amount: number; // in paisa
  purchase_order_id: string;
  purchase_order_name: string;
  customer_info?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export async function initiatePaymentService(
  paymentData: InitiatePaymentInput,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  const orderId = paymentData.purchase_order_id;
  validateObjectId(orderId, "Purchase Order ID");

  const order = await OrderModel.findById(orderId);
  if (!order) {
    throw APIError.notFound("Order not found");
  }

  // Verify ownership
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

  // Authoritatively calculate and enforce expected paisa from DB order total
  const authoritativePaisa = Math.round(order.totalAmount * 100);

  // Override amount with authoritative amount to prevent client tampering
  const securePayload = {
    ...paymentData,
    amount: authoritativePaisa,
  };

  try {
    const response = await axios.post<any>(KHALTI_INITIATE_URL, securePayload, {
      headers: {
        Authorization: `Key ${KHALTI_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    if (response.data?.pidx) {
      order.paymentId = response.data.pidx;
      await order.save();
    }

    return response.data;
  } catch (error: any) {
    const khaltiErrorMsg =
      error.response?.data?.detail ||
      error.response?.data?.message ||
      error.message ||
      "Payment gateway unreachable";

    console.warn("Khalti initiate failed:", khaltiErrorMsg);

    // Fail closed in production - NEVER generate mock payments in production
    if (env.NODE_ENV === "production") {
      throw APIError.badRequest(
        `Payment initiation failed with gateway: ${khaltiErrorMsg}`
      );
    }

    // Development-only fallback simulation
    const mockPidx = `mock_pidx_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const returnUrl = paymentData.return_url || `${env.FRONTEND_URL}/payment`;

    order.paymentId = mockPidx;
    await order.save();

    return {
      pidx: mockPidx,
      payment_url: `${returnUrl}?pidx=${mockPidx}&status=Completed&purchase_order_id=${paymentData.purchase_order_id}`,
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      expires_in: 3600,
      mock: true,
      message: "Payment initiated (Development/Sandbox simulation)",
    };
  }
}

export async function verifyPaymentService(
  pidx: string,
  orderId?: string,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  if (!pidx || typeof pidx !== "string" || !pidx.trim()) {
    throw APIError.badRequest("Payment identifier (pidx) is required");
  }

  const cleanPidx = pidx.trim();

  // Find authoritative target order
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

  // Idempotency: If order is already completed, return existing success state without duplicating
  if (targetOrder.paymentStatus === "completed") {
    return {
      pidx: cleanPidx,
      status: "Completed",
      transaction_id: targetOrder.paymentId,
      total_amount: Math.round(targetOrder.totalAmount * 100),
      fee: 0,
      refunded: false,
      alreadyVerified: true,
      message: "Payment was previously verified and completed",
    };
  }

  let verification: any = null;

  // Handle Mock Payment Tokens
  if (cleanPidx.startsWith("mock_pidx_")) {
    if (env.NODE_ENV === "production") {
      // In production: FAIL CLOSED. Reject fake/mock tokens immediately.
      targetOrder.paymentStatus = "failed";
      targetOrder.statusHistory.push({
        status: targetOrder.status,
        changedAt: new Date(),
        note: "Rejected simulated payment token in production environment",
        changedBy: "security_guard",
      });
      await targetOrder.save();
      throw APIError.forbidden(
        "Mock payment tokens are strictly forbidden in production"
      );
    }

    // Allowed ONLY in development/test mode
    verification = {
      pidx: cleanPidx,
      status: "Completed",
      transaction_id: `txn_mock_${Date.now()}`,
      total_amount: Math.round(targetOrder.totalAmount * 100),
      fee: 0,
      refunded: false,
    };
  } else {
    // Live / Test Khalti Lookup
    try {
      const response = await axios.post(
        KHALTI_LOOKUP_URL,
        { pidx: cleanPidx },
        {
          headers: {
            Authorization: `Key ${KHALTI_API_KEY}`,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );

      verification = response.data;
    } catch (error: any) {
      // FAIL CLOSED: Never assume success, never generate fake transaction ID
      const khaltiErrMsg =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        "Khalti payment verification service error";

      console.warn("Khalti lookup failed closed:", khaltiErrMsg);

      targetOrder.paymentStatus = "failed";
      targetOrder.statusHistory.push({
        status: targetOrder.status,
        changedAt: new Date(),
        note: `Payment verification failed with gateway: ${khaltiErrMsg}`,
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
      note: `Payment verification failed. Gateway status: ${statusText}`,
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
      note: `Payment amount mismatch: Expected NPR ${targetOrder.totalAmount} (${expectedPaisa} paisa), but received ${paidPaisa} paisa`,
      changedBy: "payment_system",
    });
    await targetOrder.save();

    throw APIError.badRequest(
      `Payment amount mismatch. Expected NPR ${targetOrder.totalAmount} (${expectedPaisa} paisa), but gateway reported ${paidPaisa} paisa.`
    );
  }

  // Genuine payment verified successfully
  targetOrder.paymentStatus = "completed";
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
  return verification;
}


