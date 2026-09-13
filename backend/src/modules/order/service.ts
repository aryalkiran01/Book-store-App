import { OrderModel } from "./model";
import { BookModel } from "../book/model";
import { APIError } from "../../utils/error";
import { TCreateOrderInput, TUpdateOrderStatusInput } from "./validation";
import { validateObjectId } from "../../utils/security";

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export async function createOrderService(input: TCreateOrderInput) {
  validateObjectId(input.userId, "User ID");

  if (!input.books || input.books.length === 0) {
    throw APIError.badRequest("Order must contain at least one book item");
  }

  // Authoritative server-side calculation & inventory verification
  let authoritativeTotal = 0;
  const processedItems = [];

  for (const item of input.books) {
    validateObjectId(item.bookId, "Book ID");

    const book = await BookModel.findById(item.bookId);
    if (!book) {
      throw APIError.notFound(`Book with ID ${item.bookId} not found`);
    }

    if (book.stock < item.quantity) {
      throw APIError.badRequest(
        `Insufficient stock for "${book.title}". Available: ${book.stock}, Requested: ${item.quantity}`
      );
    }

    // Calculate discounted unit price authoritatively
    const unitPrice =
      book.discountPercentage && book.discountPercentage > 0
        ? Number((book.price * (1 - book.discountPercentage / 100)).toFixed(2))
        : book.price;

    const subtotal = Number((unitPrice * item.quantity).toFixed(2));
    authoritativeTotal += subtotal;

    processedItems.push({
      bookId: book._id,
      title: book.title,
      image: book.image || "",
      price: unitPrice,
      quantity: item.quantity,
      subtotal,
    });
  }

  // Atomically decrement stock for all items
  for (const item of processedItems) {
    await BookModel.findByIdAndUpdate(item.bookId, {
      $inc: { stock: -item.quantity },
    });
  }

  const finalTotalAmount = Number(authoritativeTotal.toFixed(2));

  const newOrder = new OrderModel({
    userId: input.userId,
    books: processedItems,
    totalAmount: finalTotalAmount,
    shippingAddress: input.shippingAddress || {},
    paymentMethod: input.paymentMethod || "khalti",
    paymentStatus: input.paymentId ? "completed" : "pending",
    paymentId: input.paymentId || "",
    status: "pending",
  });

  await newOrder.save();

  return {
    orderId: newOrder._id,
    ...newOrder.toObject(),
  };
}

export async function getAllOrdersService(params?: PaginationParams) {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const [total, orders] = await Promise.all([
    OrderModel.countDocuments(),
    OrderModel.find()
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
  params?: PaginationParams
) {
  validateObjectId(userId, "User ID");
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const [total, orders] = await Promise.all([
    OrderModel.countDocuments({ userId }),
    OrderModel.find({ userId })
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

export async function getOrderByIdService(orderId: string) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findById(orderId)
    .populate("userId", "username email")
    .populate("books.bookId");
  if (!order) throw APIError.notFound("Order not found");
  return order;
}

export async function updateOrderStatusService(
  orderId: string,
  input: TUpdateOrderStatusInput
) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findById(orderId);
  if (!order) throw APIError.notFound("Order not found");

  const previousStatus = order.status;
  const newStatus = input.status;

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
    for (const item of order.books) {
      await BookModel.findByIdAndUpdate(item.bookId, {
        $inc: { stock: -item.quantity },
      });
    }
  }

  order.status = newStatus;
  if (input.paymentStatus) {
    order.paymentStatus = input.paymentStatus;
  }

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

