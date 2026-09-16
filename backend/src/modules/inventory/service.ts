import { BookModel } from "../book/model";
import { InventoryTransactionModel, TInventoryTransactionType } from "./model";
import { APIError } from "../../utils/error";
import { validateObjectId } from "../../utils/security";

export interface RecordTransactionInput {
  bookId: string;
  quantity: number;
  type: TInventoryTransactionType;
  previousStock: number;
  newStock: number;
  previousReservedStock?: number;
  newReservedStock?: number;
  referenceId?: string;
  reason?: string;
  performedBy?: string;
}

export async function recordInventoryTransaction(input: RecordTransactionInput) {
  try {
    const transaction = new InventoryTransactionModel({
      bookId: input.bookId,
      quantity: input.quantity,
      type: input.type,
      previousStock: input.previousStock,
      newStock: input.newStock,
      previousReservedStock: input.previousReservedStock ?? 0,
      newReservedStock: input.newReservedStock ?? 0,
      referenceId: input.referenceId || "",
      reason: input.reason || "",
      performedBy: input.performedBy || "system",
    });
    await transaction.save();
    return transaction;
  } catch (error) {
    console.error("Failed to record inventory transaction:", error);
  }
}

export async function reserveStockForOrder(
  items: { bookId: string; quantity: number }[],
  orderId: string,
  userId: string
) {
  const reservedItems: { bookId: string; quantity: number }[] = [];

  try {
    for (const item of items) {
      validateObjectId(item.bookId, "Book ID");
      const qty = Math.max(1, Math.floor(item.quantity));

      // Guarded atomic reservation: book must exist and (stock - reservedStock) >= qty
      const book = await BookModel.findOne({
        _id: item.bookId,
        isActive: { $ne: false },
        isDeleted: { $ne: true },
      });

      if (!book) {
        throw APIError.notFound(`Book ${item.bookId} is not available in the store catalog.`);
      }

      const available = (book.stock ?? 0) - (book.reservedStock ?? 0);
      if (available < qty) {
        throw APIError.badRequest(
          `Insufficient available stock for "${book.title}". Available: ${Math.max(0, available)}, Requested: ${qty}`
        );
      }

      const prevStock = book.stock;
      const prevReserved = book.reservedStock ?? 0;
      const updatedReserved = prevReserved + qty;

      const updated = await BookModel.findOneAndUpdate(
        {
          _id: item.bookId,
          $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, qty] },
        },
        {
          $inc: { reservedStock: qty },
        },
        { new: true }
      );

      if (!updated) {
        throw APIError.badRequest(
          `Could not reserve stock for "${book.title}". Concurrent purchase contention detected.`
        );
      }

      reservedItems.push({ bookId: item.bookId, quantity: qty });

      await recordInventoryTransaction({
        bookId: item.bookId,
        quantity: qty,
        type: "RESERVATION",
        previousStock: prevStock,
        newStock: prevStock,
        previousReservedStock: prevReserved,
        newReservedStock: updatedReserved,
        referenceId: orderId,
        reason: `Reserved for Order #${orderId}`,
        performedBy: userId,
      });
    }

    return true;
  } catch (err) {
    // Compensating rollback for reservations completed prior to failure
    for (const res of reservedItems) {
      try {
        await BookModel.findByIdAndUpdate(res.bookId, {
          $inc: { reservedStock: -res.quantity },
        });
      } catch (rollbackErr) {
        console.error("Critical rollback error releasing reservations:", rollbackErr);
      }
    }
    throw err;
  }
}

export async function commitOrderReservation(
  items: { bookId: string; quantity: number }[],
  orderId: string,
  performedBy = "payment_system"
) {
  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity));
    const book = await BookModel.findById(item.bookId);
    if (!book) continue;

    const prevStock = book.stock;
    const prevReserved = book.reservedStock ?? 0;

    // Convert reservation to permanent sale: decrement stock and decrement reservedStock
    const updatedBook = await BookModel.findByIdAndUpdate(
      item.bookId,
      {
        $inc: {
          stock: -qty,
          reservedStock: -Math.min(prevReserved, qty),
        },
      },
      { new: true }
    );

    if (updatedBook) {
      await recordInventoryTransaction({
        bookId: item.bookId,
        quantity: -qty,
        type: "SALE",
        previousStock: prevStock,
        newStock: updatedBook.stock,
        previousReservedStock: prevReserved,
        newReservedStock: updatedBook.reservedStock,
        referenceId: orderId,
        reason: `Sale confirmed for Order #${orderId}`,
        performedBy,
      });
    }
  }
}

export async function releaseOrderReservation(
  items: { bookId: string; quantity: number }[],
  orderId: string,
  reason = "Order cancelled / reservation expired",
  performedBy = "system"
) {
  for (const item of items) {
    const qty = Math.max(1, Math.floor(item.quantity));
    const book = await BookModel.findById(item.bookId);
    if (!book) continue;

    const prevStock = book.stock;
    const prevReserved = book.reservedStock ?? 0;
    const releaseQty = Math.min(prevReserved, qty);

    if (releaseQty > 0) {
      const updatedBook = await BookModel.findByIdAndUpdate(
        item.bookId,
        {
          $inc: { reservedStock: -releaseQty },
        },
        { new: true }
      );

      if (updatedBook) {
        await recordInventoryTransaction({
          bookId: item.bookId,
          quantity: releaseQty,
          type: "RESERVATION_RELEASE",
          previousStock: prevStock,
          newStock: prevStock,
          previousReservedStock: prevReserved,
          newReservedStock: updatedBook.reservedStock,
          referenceId: orderId,
          reason,
          performedBy,
        });
      }
    }
  }
}

export async function adjustStockService(
  bookId: string,
  newStock: number,
  adminId: string,
  reason = "Admin manual stock adjustment"
) {
  validateObjectId(bookId, "Book ID");
  const book = await BookModel.findById(bookId);
  if (!book) throw APIError.notFound("Book not found");

  const prevStock = book.stock;
  const diff = newStock - prevStock;
  book.stock = Math.max(0, newStock);
  await book.save();

  await recordInventoryTransaction({
    bookId,
    quantity: diff,
    type: "MANUAL_ADJUSTMENT",
    previousStock: prevStock,
    newStock: book.stock,
    previousReservedStock: book.reservedStock ?? 0,
    newReservedStock: book.reservedStock ?? 0,
    reason,
    performedBy: adminId,
  });

  return book;
}

export async function getInventoryHistoryService(params?: {
  bookId?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const query: any = {};
  if (params?.bookId) {
    validateObjectId(params.bookId, "Book ID");
    query.bookId = params.bookId;
  }

  const [total, transactions] = await Promise.all([
    InventoryTransactionModel.countDocuments(query),
    InventoryTransactionModel.find(query)
      .populate("bookId", "title author isbn image")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    transactions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
