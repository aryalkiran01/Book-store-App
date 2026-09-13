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

  const normalizedAddress =
    typeof input.shippingAddress === "string"
      ? { street: input.shippingAddress }
      : input.shippingAddress || {};

  const newOrder = new OrderModel({
    userId: input.userId,
    books: processedItems,
    totalAmount: finalTotalAmount,
    shippingAddress: normalizedAddress,
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
