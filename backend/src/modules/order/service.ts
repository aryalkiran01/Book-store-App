import { OrderModel } from "./model";
import { BookModel } from "../book/model";
import { UserModel } from "../auth/model";
import { APIError } from "../../utils/error";
import { TCreateOrderInput, TUpdateOrderStatusInput } from "./validation";
import { validateObjectId } from "../../utils/security";
import {
  commitOrderReservation,
  recordInventoryTransaction,
  releaseOrderReservation,
  reserveStockForOrder,
} from "../inventory/service";
import { RefundModel } from "../payment/refund.model";
import { generateCryptoToken } from "../../utils/auth";
import { recordCouponUsageService, validateCouponService } from "../coupon/service";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface CartValidationItem {
  bookId: string;
  quantity: number;
}

export async function validateCartService(items: CartValidationItem[]) {
  if (!items || items.length === 0) {
    return {
      items: [],
      rawSubtotal: 0,
      discountSavings: 0,
      subtotal: 0,
      shipping: 0,
      finalTotal: 0,
      totalItems: 0,
      isValid: true,
      warnings: [],
    };
  }

  const processedItems = [];
  const warnings: string[] = [];
  let rawSubtotal = 0;
  let subtotal = 0;
  let totalItems = 0;
  let isValid = true;

  for (const item of items) {
    validateObjectId(item.bookId, "Book ID");
    const book = await BookModel.findOne({
      _id: item.bookId,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    }).lean();

    if (!book) {
      warnings.push(`A requested book item is no longer available in the catalog.`);
      isValid = false;
      continue;
    }

    const availableStock = Math.max(0, (book.stock ?? 0) - (book.reservedStock ?? 0));
    const inStock = availableStock > 0;
    const requestedQty = Math.max(1, Math.floor(item.quantity));
    const effectiveQty = inStock ? Math.min(requestedQty, availableStock) : 0;

    if (!inStock) {
      warnings.push(`"${book.title}" is currently out of stock.`);
      isValid = false;
    } else if (requestedQty > availableStock) {
      warnings.push(
        `"${book.title}" only has ${availableStock} available copies. Quantity adjusted.`
      );
    }

    const unitPrice =
      book.discountPercentage && book.discountPercentage > 0
        ? Number((book.price * (1 - book.discountPercentage / 100)).toFixed(2))
        : book.price;

    const itemRawTotal = Number((book.price * (inStock ? effectiveQty : 0)).toFixed(2));
    const itemTotal = Number((unitPrice * (inStock ? effectiveQty : 0)).toFixed(2));

    rawSubtotal += itemRawTotal;
    subtotal += itemTotal;
    if (inStock) {
      totalItems += effectiveQty;
    }

    processedItems.push({
      bookId: book._id,
      title: book.title,
      author: book.author,
      genre: book.genre,
      image: book.image || "",
      originalPrice: book.price,
      discountPercentage: book.discountPercentage || 0,
      effectivePrice: unitPrice,
      requestedQuantity: requestedQty,
      quantity: inStock ? effectiveQty : requestedQty,
      availableStock,
      inStock,
      hasSufficientStock: availableStock >= requestedQty,
      itemTotal,
    });
  }

  rawSubtotal = Number(rawSubtotal.toFixed(2));
  subtotal = Number(subtotal.toFixed(2));
  const discountSavings = Number((rawSubtotal - subtotal).toFixed(2));

  // Shipping calculation: Free shipping above NPR 1000, else NPR 100
  const shipping = subtotal === 0 ? 0 : subtotal >= 1000 ? 0 : 100;
  const finalTotal = Number((subtotal + shipping).toFixed(2));

  return {
    items: processedItems,
    rawSubtotal,
    discountSavings,
    subtotal,
    shipping,
    finalTotal,
    totalItems,
    isValid: isValid && processedItems.length > 0,
    warnings,
  };
}

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["returned", "delivered"],
  returned: ["refund_pending"],
  refund_pending: ["refunded"],
  cancelled: [],
  refunded: [],
};

export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  if (currentStatus === newStatus) return true;
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
}

export async function createOrderService(input: TCreateOrderInput) {
  validateObjectId(input.userId, "User ID");

  const rawBooks = input.books || (input as any).items || [];
  if (!rawBooks || rawBooks.length === 0) {
    throw APIError.badRequest("Order must contain at least one book item");
  }

  // Validate quantities, sanitize list, and merge duplicate book IDs
  const itemMap = new Map<string, number>();
  for (const item of rawBooks) {
    validateObjectId(item.bookId, "Book ID");
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw APIError.badRequest(
        `Invalid quantity for book ID ${item.bookId}. Quantity must be a positive integer greater than 0.`
      );
    }
    const key = item.bookId.toString();
    const currentQty = itemMap.get(key) || 0;
    itemMap.set(key, currentQty + qty);
  }

  const sanitizedItems = Array.from(itemMap.entries()).map(([bookId, quantity]) => ({
    bookId,
    quantity,
  }));

  const processedItems = [];
  let authoritativeSubtotal = 0;
  let rawSubtotal = 0;

  // 1. Authoritatively fetch books and calculate prices
  for (const item of sanitizedItems) {
    const book = await BookModel.findOne({
      _id: item.bookId,
      isActive: { $ne: false },
      isDeleted: { $ne: true },
    }).lean();

    if (!book) {
      throw APIError.notFound(`Book with ID ${item.bookId} is not available in the catalog.`);
    }

    const available = (book.stock ?? 0) - (book.reservedStock ?? 0);
    if (available < item.quantity) {
      throw APIError.badRequest(
        `Insufficient available stock for "${book.title}". Available: ${Math.max(0, available)}, Requested: ${item.quantity}`
      );
    }

    const originalPrice = book.price;
    const discountPercentage = book.discountPercentage || 0;
    const unitPrice =
      discountPercentage > 0
        ? Number((originalPrice * (1 - discountPercentage / 100)).toFixed(2))
        : originalPrice;

    const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
    const itemRawTotal = Number((originalPrice * item.quantity).toFixed(2));

    rawSubtotal += itemRawTotal;
    authoritativeSubtotal += itemTotal;

    // Full immutable snapshot of item at time of purchase
    processedItems.push({
      bookId: book._id,
      title: book.title,
      author: book.author || "",
      image: book.image || "",
      price: unitPrice,
      originalPrice,
      discountPercentage,
      quantity: item.quantity,
      subtotal: itemTotal,
    });
  }

  const subtotal = Number(authoritativeSubtotal.toFixed(2));
  const discount = Number((rawSubtotal - subtotal).toFixed(2));
  const shippingCost = subtotal >= 1000 ? 0 : 100;

  // Coupon evaluation
  let couponCode = "";
  let couponDiscount = 0;
  if (input.couponCode && input.couponCode.trim()) {
    try {
      const couponRes = await validateCouponService(input.couponCode.trim(), subtotal);
      couponCode = couponRes.code;
      couponDiscount = couponRes.discountAmount;
    } catch (couponErr: any) {
      throw APIError.badRequest(`Invalid coupon: ${couponErr.message}`);
    }
  }

  const finalTotalAmount = Math.max(
    0,
    Number((subtotal - couponDiscount + shippingCost).toFixed(2))
  );

  // 2. Resolve contact information from request or user account fallback
  let inputFullName =
    input.customerInfo?.fullName ||
    input.fullName ||
    (typeof input.shippingAddress === "object"
      ? input.shippingAddress?.fullName
      : "") ||
    "";
  let inputEmail =
    input.customerInfo?.email ||
    input.email ||
    (typeof input.shippingAddress === "object"
      ? input.shippingAddress?.email
      : "") ||
    "";
  let inputPhone =
    input.customerInfo?.phone ||
    input.phone ||
    (typeof input.shippingAddress === "object"
      ? (input.shippingAddress as any)?.phone ||
        (input.shippingAddress as any)?.phoneNumber
      : "") ||
    "";

  if (!inputFullName || !inputEmail) {
    const userDoc = await UserModel.findById(input.userId).lean();
    if (userDoc) {
      if (!inputFullName) inputFullName = userDoc.username || "Customer";
      if (!inputEmail) inputEmail = userDoc.email || "";
    }
  }

  const customerInfo = {
    fullName: inputFullName.trim(),
    email: inputEmail.trim().toLowerCase(),
    phone: inputPhone.trim(),
  };

  const normalizedAddress =
    typeof input.shippingAddress === "string"
      ? {
          street: input.shippingAddress,
          fullName: customerInfo.fullName,
          email: customerInfo.email,
          phone: customerInfo.phone,
        }
      : {
          fullName: customerInfo.fullName,
          email: customerInfo.email,
          phone: customerInfo.phone,
          street:
            input.shippingAddress?.street ||
            (input.shippingAddress as any)?.address ||
            "",
          city: input.shippingAddress?.city || "",
          state: input.shippingAddress?.state || "",
          postalCode: input.shippingAddress?.postalCode || "",
        };

  const paymentMethod = input.paymentMethod || "khalti";
  const isCOD = paymentMethod === "cod" || paymentMethod === "cash_on_delivery";

  // Online orders get 15-minute reservation window; COD confirmed directly
  const reservationExpiresAt = isCOD ? undefined : new Date(Date.now() + 15 * 60 * 1000);
  const initialStatus = isCOD ? "confirmed" : "pending";
  const initialPaymentStatus = isCOD ? "pending" : "pending";

  const newOrder = new OrderModel({
    userId: input.userId,
    customerInfo,
    books: processedItems,
    subtotal,
    shippingCost,
    discount,
    couponCode,
    couponDiscount,
    totalAmount: finalTotalAmount,
    shippingAddress: normalizedAddress,
    orderNote: input.orderNote || "",
    paymentMethod,
    paymentStatus: initialPaymentStatus,
    paymentId: "",
    status: initialStatus,
    reservationExpiresAt,
    deliveryStatus: "pending",
    statusHistory: [
      {
        status: initialStatus,
        changedAt: new Date(),
        note: isCOD
          ? "Order placed with Cash on Delivery (Confirmed)"
          : "Order placed by customer (Awaiting payment verification, stock reserved for 15 minutes)",
        changedBy: "customer",
      },
    ],
  });

  await newOrder.save();

  if (couponCode) {
    try {
      await recordCouponUsageService(couponCode);
    } catch (err: any) {
      console.warn("Coupon usage record note:", err.message);
    }
  }

  // 3. Perform atomic stock reservation in inventory
  try {
    if (isCOD) {
      // For COD, commit deduction immediately
      for (const item of sanitizedItems) {
        const updated = await BookModel.findOneAndUpdate(
          {
            _id: item.bookId,
            $expr: {
              $gte: [
                { $subtract: [{ $ifNull: ["$stock", 0] }, { $ifNull: ["$reservedStock", 0] }] },
                item.quantity,
              ],
            },
          },
          { $inc: { stock: -item.quantity } },
          { new: true }
        );

        if (!updated) {
          throw APIError.badRequest("Insufficient stock available for this order.");
        }

        await recordInventoryTransaction({
          bookId: item.bookId,
          quantity: -item.quantity,
          type: "SALE",
          previousStock: updated.stock + item.quantity,
          newStock: updated.stock,
          referenceId: newOrder._id.toString(),
          reason: `Cash On Delivery Order #${newOrder._id}`,
          performedBy: input.userId,
        });
      }
    } else {
      // For online checkout, place in reservedStock pool
      await reserveStockForOrder(sanitizedItems, newOrder._id.toString(), input.userId);
    }
  } catch (invErr) {
    await OrderModel.findByIdAndDelete(newOrder._id);
    throw invErr;
  }

  return {
    orderId: newOrder._id,
    ...newOrder.toObject(),
  };
}

export async function getAllOrdersService(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const query: any = { isDeleted: { $ne: true } };
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  }

  const [total, orders] = await Promise.all([
    OrderModel.countDocuments(query),
    OrderModel.find(query)
      .populate("userId", "username email")
      .populate("books.bookId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    orders,
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

export async function getOrdersByUserIdService(
  userId: string,
  params?: { page?: number; limit?: number; status?: string }
) {
  validateObjectId(userId, "User ID");
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const query: any = { userId, isDeleted: { $ne: true } };
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  }

  const [total, orders] = await Promise.all([
    OrderModel.countDocuments(query),
    OrderModel.find(query)
      .populate("books.bookId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    orders,
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

export async function getOrderByIdService(
  orderId: string,
  requestingUserId?: string,
  requestingUserRole?: string
) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: { $ne: true } })
    .populate("userId", "username email")
    .populate("books.bookId");
  if (!order) throw APIError.notFound("Order not found");

  const orderOwnerId =
    order.userId && typeof order.userId === "object" && "_id" in order.userId
      ? (order.userId as any)._id.toString()
      : String(order.userId || "");

  // Strict ownership check (Fail Closed): Caller must be authenticated owner or admin
  if (
    !requestingUserId ||
    (requestingUserRole !== "admin" && orderOwnerId !== requestingUserId)
  ) {
    throw APIError.forbidden("You do not have permission to view this order");
  }

  return order;
}

export async function cancelOrderService(
  orderId: string,
  requestingUserId: string,
  requestingUserRole: string,
  reason?: string
) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: { $ne: true } });
  if (!order) throw APIError.notFound("Order not found");

  const orderOwnerId =
    order.userId && typeof order.userId === "object" && "_id" in order.userId
      ? (order.userId as any)._id.toString()
      : String(order.userId || "");

  if (
    !requestingUserId ||
    (requestingUserRole !== "admin" && orderOwnerId !== requestingUserId)
  ) {
    throw APIError.forbidden("You are not authorized to cancel this order");
  }

  const cancellableStates = ["pending", "confirmed", "processing"];
  if (!cancellableStates.includes(order.status)) {
    throw APIError.badRequest(
      `Cannot cancel order in '${order.status}' status. Orders that are shipped or delivered cannot be cancelled directly.`
    );
  }

  // Release inventory reservation / restore physical stock
  const items = order.books.map((b) => ({
    bookId: b.bookId.toString(),
    quantity: b.quantity,
  }));

  if (order.paymentStatus === "completed" || order.paymentMethod === "cod") {
    // Restore physical stock
    for (const item of items) {
      await BookModel.findByIdAndUpdate(item.bookId, { $inc: { stock: item.quantity } });
    }
  } else {
    // Release reserved stock pool
    await releaseOrderReservation(
      items,
      order._id.toString(),
      reason || "Cancelled by customer",
      requestingUserRole === "admin" ? "admin" : "customer"
    );
  }

  order.status = "cancelled";
  order.cancellationReason = reason || "Cancelled by user";
  order.cancelledAt = new Date();
  order.reservationExpiresAt = undefined as any;
  order.statusHistory.push({
    status: "cancelled",
    changedAt: new Date(),
    note: reason ? `Cancelled: ${reason}` : "Order cancelled",
    changedBy: requestingUserRole === "admin" ? "admin" : "customer",
  });

  await order.save();
  return order;
}

export async function updateOrderStatusService(
  orderId: string,
  input: TUpdateOrderStatusInput,
  adminUsername?: string
) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: { $ne: true } });
  if (!order) throw APIError.notFound("Order not found");

  const previousStatus = order.status;
  const newStatus = input.status;

  if (!isValidStatusTransition(previousStatus, newStatus)) {
    throw APIError.badRequest(
      `Invalid order status transition from '${previousStatus}' to '${newStatus}'.`
    );
  }

  const items = order.books.map((b) => ({
    bookId: b.bookId.toString(),
    quantity: b.quantity,
  }));

  // Reconcile stock when transitioning to cancelled
  if (previousStatus !== "cancelled" && newStatus === "cancelled") {
    if (order.paymentStatus === "completed" || order.paymentMethod === "cod") {
      for (const item of items) {
        await BookModel.findByIdAndUpdate(item.bookId, { $inc: { stock: item.quantity } });
      }
    } else {
      await releaseOrderReservation(items, order._id.toString(), "Admin cancelled order", adminUsername || "admin");
    }
  }

  order.status = newStatus;
  if (input.paymentStatus) {
    order.paymentStatus = input.paymentStatus;
  }

  order.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    note: input.note || `Status updated to ${newStatus}`,
    changedBy: adminUsername || "admin",
  });

  await order.save();
  return order;
}

export async function updateOrderShippingService(
  orderId: string,
  shippingData: {
    shippingProvider?: string;
    trackingNumber?: string;
    shippedAt?: string | Date;
    estimatedDeliveryAt?: string | Date;
    deliveredAt?: string | Date;
    deliveryStatus?: string;
  },
  adminUsername = "admin"
) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: { $ne: true } });
  if (!order) throw APIError.notFound("Order not found");

  if (shippingData.shippingProvider !== undefined) order.shippingProvider = shippingData.shippingProvider;
  if (shippingData.trackingNumber !== undefined) order.trackingNumber = shippingData.trackingNumber;
  if (shippingData.shippedAt) order.shippedAt = new Date(shippingData.shippedAt);
  if (shippingData.estimatedDeliveryAt) order.estimatedDeliveryAt = new Date(shippingData.estimatedDeliveryAt);
  if (shippingData.deliveredAt) order.deliveredAt = new Date(shippingData.deliveredAt);

  if (shippingData.deliveryStatus) {
    order.deliveryStatus = shippingData.deliveryStatus as any;
    if (shippingData.deliveryStatus === "shipped" && order.status === "processing") {
      order.status = "shipped";
      order.shippedAt = order.shippedAt || new Date();
    } else if (shippingData.deliveryStatus === "delivered" && order.status === "shipped") {
      order.status = "delivered";
      order.deliveredAt = order.deliveredAt || new Date();
    }
  }

  order.statusHistory.push({
    status: order.status,
    changedAt: new Date(),
    note: `Shipping updated: ${shippingData.shippingProvider || ""} (Tracking: ${shippingData.trackingNumber || "N/A"}) - Status: ${shippingData.deliveryStatus || order.deliveryStatus}`,
    changedBy: adminUsername,
  });

  await order.save();
  return order;
}

export async function deleteOrderService(orderId: string, adminUserId = "") {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findOne({ _id: orderId, isDeleted: { $ne: true } });
  if (!order) throw APIError.notFound("Order not found");

  // Non-destructive soft delete preserving financial history
  order.isDeleted = true;
  order.deletedAt = new Date();
  if (adminUserId) {
    order.deletedBy = adminUserId as any;
  }

  await order.save();
  return order;
}

export async function createRefundRequestService(
  orderId: string,
  userId: string,
  reason: string,
  amount?: number
) {
  validateObjectId(orderId, "Order ID");
  validateObjectId(userId, "User ID");

  const order = await OrderModel.findOne({ _id: orderId, isDeleted: { $ne: true } });
  if (!order) throw APIError.notFound("Order not found");

  if (order.userId.toString() !== userId) {
    throw APIError.forbidden("You can only request refunds for your own orders.");
  }

  if (order.status !== "delivered" && order.paymentStatus !== "completed") {
    throw APIError.badRequest("Refund can only be requested for paid or delivered orders.");
  }

  const refundAmount = amount && amount > 0 ? Math.min(amount, order.totalAmount) : order.totalAmount;
  const refundId = `REF_${Date.now()}_${generateCryptoToken(6)}`;

  const refund = new RefundModel({
    refundId,
    orderId: order._id,
    userId,
    amount: refundAmount,
    reason,
    status: "requested",
    provider: order.paymentMethod,
    requestedBy: userId,
  });

  await refund.save();

  order.status = "return_requested";
  order.statusHistory.push({
    status: "return_requested",
    changedAt: new Date(),
    note: `Customer requested refund (${refundId}): ${reason}`,
    changedBy: "customer",
  });
  await order.save();

  return refund;
}


