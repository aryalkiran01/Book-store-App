import { OrderModel } from "./model";
import { BookModel } from "../book/model";
import { APIError } from "../../utils/error";
import { TCreateOrderInput, TUpdateOrderStatusInput } from "./validation";
import { validateObjectId } from "../../utils/security";

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
    const book = await BookModel.findById(item.bookId).lean();
    if (!book) {
      warnings.push(`A requested book item is no longer available in the catalog.`);
      isValid = false;
      continue;
    }

    const availableStock = book.stock ?? 0;
    const inStock = availableStock > 0;
    const requestedQty = Math.max(1, Math.floor(item.quantity));
    const effectiveQty = inStock ? Math.min(requestedQty, availableStock) : 0;

    if (!inStock) {
      warnings.push(`"${book.title}" is currently out of stock.`);
      isValid = false;
    } else if (requestedQty > availableStock) {
      warnings.push(
        `"${book.title}" only has ${availableStock} in stock. Quantity adjusted.`
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
  delivered: ["refunded"],
  cancelled: ["refunded"],
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

  // Validate quantities and sanitize list
  const sanitizedItems: { bookId: string; quantity: number }[] = [];
  for (const item of rawBooks) {
    validateObjectId(item.bookId, "Book ID");
    const qty = Number(item.quantity);
    if (!Number.isInteger(qty) || qty <= 0) {
      throw APIError.badRequest(
        `Invalid quantity for book ID ${item.bookId}. Quantity must be a positive integer greater than 0.`
      );
    }
    sanitizedItems.push({
      bookId: item.bookId.toString(),
      quantity: qty,
    });
  }

  // Track successfully decremented items for compensating rollback if any subsequent update fails
  const decrementedItems: { bookId: string; quantity: number }[] = [];
  const processedItems = [];
  let authoritativeSubtotal = 0;
  let rawSubtotal = 0;

  try {
    for (const item of sanitizedItems) {
      // Atomic guarded update: ONLY decrement if stock >= requested quantity
      const updatedBook = await BookModel.findOneAndUpdate(
        {
          _id: item.bookId,
          stock: { $gte: item.quantity },
        },
        {
          $inc: { stock: -item.quantity },
        },
        {
          new: true,
        }
      );

      if (!updatedBook) {
        // Find out why: Book not found or insufficient stock
        const existingBook = await BookModel.findById(item.bookId).lean();
        if (!existingBook) {
          throw APIError.notFound(`Book with ID ${item.bookId} not found`);
        } else {
          throw APIError.badRequest(
            `Insufficient stock for "${existingBook.title}". Available: ${existingBook.stock}, Requested: ${item.quantity}`
          );
        }
      }

      // Record successful atomic decrement
      decrementedItems.push({
        bookId: item.bookId,
        quantity: item.quantity,
      });

      // Calculate authoritative prices directly from the fresh database record
      const originalPrice = updatedBook.price;
      const discountPercentage = updatedBook.discountPercentage || 0;
      const unitPrice =
        discountPercentage > 0
          ? Number((originalPrice * (1 - discountPercentage / 100)).toFixed(2))
          : originalPrice;

      const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
      const itemRawTotal = Number((originalPrice * item.quantity).toFixed(2));

      rawSubtotal += itemRawTotal;
      authoritativeSubtotal += itemTotal;

      processedItems.push({
        bookId: updatedBook._id,
        title: updatedBook.title,
        image: updatedBook.image || "",
        price: unitPrice,
        quantity: item.quantity,
        subtotal: itemTotal,
      });
    }

    const subtotal = Number(authoritativeSubtotal.toFixed(2));
    const discount = Number((rawSubtotal - subtotal).toFixed(2));
    const shippingCost = subtotal >= 1000 ? 0 : 100;
    const finalTotalAmount = Number((subtotal + shippingCost).toFixed(2));

    const normalizedAddress =
      typeof input.shippingAddress === "string"
        ? { street: input.shippingAddress }
        : input.shippingAddress || {};

    // Security: NEVER trust client-supplied paymentId to complete payment upon creation.
    // All orders must start as pending payment and undergo server-side payment verification.
    const initialStatus = "pending";
    const initialPaymentStatus = "pending";

    const newOrder = new OrderModel({
      userId: input.userId,
      books: processedItems,
      subtotal,
      shippingCost,
      discount,
      totalAmount: finalTotalAmount,
      shippingAddress: normalizedAddress,
      orderNote: input.orderNote || "",
      paymentMethod: input.paymentMethod || "khalti",
      paymentStatus: initialPaymentStatus,
      paymentId: input.paymentId || "",
      status: initialStatus,
      statusHistory: [
        {
          status: initialStatus,
          changedAt: new Date(),
          note: "Order placed by customer (Awaiting payment verification)",
          changedBy: "customer",
        },
      ],
    });

    await newOrder.save();

    return {
      orderId: newOrder._id,
      ...newOrder.toObject(),
    };
  } catch (error) {
    // Compensating rollback: Revert all decrements performed before the failure
    if (decrementedItems.length > 0) {
      for (const dec of decrementedItems) {
        try {
          await BookModel.findByIdAndUpdate(dec.bookId, {
            $inc: { stock: dec.quantity },
          });
        } catch (rollbackErr) {
          console.error("Critical error rolling back inventory decrement:", rollbackErr);
        }
      }
    }
    throw error;
  }
}

export async function getAllOrdersService(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const query: any = {};
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

  const query: any = { userId };
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
  const order = await OrderModel.findById(orderId)
    .populate("userId", "username email")
    .populate("books.bookId");
  if (!order) throw APIError.notFound("Order not found");

  // Verify ownership if caller is not an admin
  if (
    requestingUserId &&
    requestingUserRole !== "admin" &&
    order.userId._id.toString() !== requestingUserId
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
  const order = await OrderModel.findById(orderId);
  if (!order) throw APIError.notFound("Order not found");

  // Ownership check
  if (
    requestingUserRole !== "admin" &&
    order.userId.toString() !== requestingUserId
  ) {
    throw APIError.forbidden("You are not authorized to cancel this order");
  }

  // Can only cancel before shipping
  const cancellableStates = ["pending", "confirmed", "processing"];
  if (!cancellableStates.includes(order.status)) {
    throw APIError.badRequest(
      `Cannot cancel order in '${order.status}' status. Orders that are shipped or delivered cannot be cancelled directly.`
    );
  }

  // Restore inventory
  for (const item of order.books) {
    await BookModel.findByIdAndUpdate(item.bookId, {
      $inc: { stock: item.quantity },
    });
  }

  order.status = "cancelled";
  order.cancellationReason = reason || "Cancelled by user";
  order.cancelledAt = new Date();
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
  const order = await OrderModel.findById(orderId);
  if (!order) throw APIError.notFound("Order not found");

  const previousStatus = order.status;
  const newStatus = input.status;

  // Validate state transition
  if (!isValidStatusTransition(previousStatus, newStatus)) {
    throw APIError.badRequest(
      `Invalid order status transition from '${previousStatus}' to '${newStatus}'.`
    );
  }

  // Restore inventory if an order is cancelled
  if (previousStatus !== "cancelled" && newStatus === "cancelled") {
    for (const item of order.books) {
      await BookModel.findByIdAndUpdate(item.bookId, {
        $inc: { stock: item.quantity },
      });
    }
  }

  // Deduct inventory again if previously cancelled order is reinstated
  if (previousStatus === "cancelled" && newStatus !== "cancelled") {
    const decrementedItems: { bookId: any; quantity: number }[] = [];
    try {
      for (const item of order.books) {
        const updatedBook = await BookModel.findOneAndUpdate(
          {
            _id: item.bookId,
            stock: { $gte: item.quantity },
          },
          {
            $inc: { stock: -item.quantity },
          },
          { new: true }
        );

        if (!updatedBook) {
          throw APIError.badRequest(
            `Cannot reinstate order: Insufficient stock for book ID ${item.bookId}`
          );
        }

        decrementedItems.push({
          bookId: item.bookId,
          quantity: item.quantity,
        });
      }
    } catch (err) {
      for (const dec of decrementedItems) {
        await BookModel.findByIdAndUpdate(dec.bookId, {
          $inc: { stock: dec.quantity },
        });
      }
      throw err;
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

export async function deleteOrderService(orderId: string) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findById(orderId);
  if (!order) throw APIError.notFound("Order not found");

  // Restore stock if active order is deleted
  if (order.status !== "cancelled") {
    for (const item of order.books) {
      await BookModel.findByIdAndUpdate(item.bookId, {
        $inc: { stock: item.quantity },
      });
    }
  }

  await OrderModel.findByIdAndDelete(orderId);
  return order;
}

