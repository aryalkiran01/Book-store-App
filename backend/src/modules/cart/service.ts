import { CartModel } from "./model";
import { BookModel } from "../book/model";
import { validateObjectId } from "../../utils/security";
import { APIError } from "../../utils/error";

export async function getCartService(userId: string) {
  validateObjectId(userId, "User ID");

  let cart = await CartModel.findOne({ userId }).populate({
    path: "items.bookId",
    select: "title author genre price discountPercentage stock reservedStock image isActive isDeleted",
  });

  if (!cart) {
    cart = await CartModel.create({ userId, items: [] });
  }

  // Filter and validate active items
  const validatedItems = [];
  let subtotal = 0;
  let rawSubtotal = 0;
  let totalQuantity = 0;
  let hasChanges = false;

  for (const item of cart.items) {
    const book: any = item.bookId;
    if (!book || book.isDeleted || book.isActive === false) {
      hasChanges = true;
      continue; // exclude unavailable books
    }

    const availableStock = Math.max(0, (book.stock ?? 0) - (book.reservedStock ?? 0));
    const effectiveQuantity = Math.min(item.quantity, Math.max(1, availableStock));

    if (effectiveQuantity !== item.quantity) {
      item.quantity = effectiveQuantity;
      hasChanges = true;
    }

    const unitPrice =
      book.discountPercentage && book.discountPercentage > 0
        ? Number((book.price * (1 - book.discountPercentage / 100)).toFixed(2))
        : book.price;

    const itemTotal = Number((unitPrice * item.quantity).toFixed(2));
    const itemRawTotal = Number((book.price * item.quantity).toFixed(2));

    subtotal += itemTotal;
    rawSubtotal += itemRawTotal;
    totalQuantity += item.quantity;

    validatedItems.push({
      book: {
        _id: book._id,
        title: book.title,
        author: book.author,
        genre: book.genre,
        price: book.price,
        discountPercentage: book.discountPercentage || 0,
        effectivePrice: unitPrice,
        stock: book.stock,
        availableStock,
        image: book.image,
      },
      quantity: item.quantity,
      itemTotal,
      addedAt: item.addedAt,
      inStock: availableStock > 0,
    });
  }

  if (hasChanges) {
    // Persist filtered items back to MongoDB
    cart.items = cart.items.filter((i) => i.bookId && !(i.bookId as any).isDeleted) as any;
    await cart.save();
  }

  const discountSavings = Number((rawSubtotal - subtotal).toFixed(2));
  const shipping = subtotal === 0 ? 0 : subtotal >= 1000 ? 0 : 100;
  const grandTotal = Number((subtotal + shipping).toFixed(2));

  return {
    items: validatedItems,
    itemCount: validatedItems.length,
    totalQuantity,
    rawSubtotal: Number(rawSubtotal.toFixed(2)),
    discountSavings,
    subtotal: Number(subtotal.toFixed(2)),
    shipping,
    grandTotal,
  };
}

export async function addToCartService(userId: string, bookId: string, quantity = 1) {
  validateObjectId(userId, "User ID");
  validateObjectId(bookId, "Book ID");

  const qty = Math.max(1, Math.floor(quantity));

  const book = await BookModel.findOne({
    _id: bookId,
    isActive: { $ne: false },
    isDeleted: { $ne: true },
  });

  if (!book) {
    throw APIError.notFound("Book not found or unavailable in store");
  }

  const availableStock = Math.max(0, (book.stock ?? 0) - (book.reservedStock ?? 0));
  if (availableStock <= 0) {
    throw APIError.badRequest(`"${book.title}" is currently out of stock`);
  }

  let cart = await CartModel.findOne({ userId });
  if (!cart) {
    cart = new CartModel({ userId, items: [] });
  }

  const existingItemIndex = cart.items.findIndex(
    (item) => item.bookId.toString() === bookId
  );

  if (existingItemIndex > -1) {
    const newQty = cart.items[existingItemIndex].quantity + qty;
    cart.items[existingItemIndex].quantity = Math.min(newQty, availableStock);
  } else {
    cart.items.push({
      bookId: book._id as any,
      quantity: Math.min(qty, availableStock),
      addedAt: new Date(),
    });
  }

  await cart.save();
  return getCartService(userId);
}

export async function updateCartItemQuantityService(
  userId: string,
  bookId: string,
  quantity: number
) {
  validateObjectId(userId, "User ID");
  validateObjectId(bookId, "Book ID");

  let cart = await CartModel.findOne({ userId });
  if (!cart) {
    throw APIError.notFound("Cart not found");
  }

  const qty = Math.floor(quantity);

  if (qty <= 0) {
    cart.items = cart.items.filter((item) => item.bookId.toString() !== bookId) as any;
  } else {
    const item = cart.items.find((item) => item.bookId.toString() === bookId);
    if (!item) {
      throw APIError.notFound("Item not found in cart");
    }

    const book = await BookModel.findById(bookId);
    if (book) {
      const availableStock = Math.max(0, (book.stock ?? 0) - (book.reservedStock ?? 0));
      item.quantity = Math.min(qty, Math.max(1, availableStock));
    } else {
      item.quantity = qty;
    }
  }

  await cart.save();
  return getCartService(userId);
}

export async function removeFromCartService(userId: string, bookId: string) {
  validateObjectId(userId, "User ID");
  validateObjectId(bookId, "Book ID");

  const cart = await CartModel.findOne({ userId });
  if (cart) {
    cart.items = cart.items.filter((item) => item.bookId.toString() !== bookId) as any;
    await cart.save();
  }

  return getCartService(userId);
}

export async function syncGuestCartService(
  userId: string,
  guestItems: { bookId: string; quantity: number }[]
) {
  validateObjectId(userId, "User ID");

  if (!guestItems || !Array.isArray(guestItems) || guestItems.length === 0) {
    return getCartService(userId);
  }

  let cart = await CartModel.findOne({ userId });
  if (!cart) {
    cart = new CartModel({ userId, items: [] });
  }

  for (const guestItem of guestItems) {
    if (!guestItem.bookId) continue;
    try {
      validateObjectId(guestItem.bookId, "Book ID");
      const qty = Math.max(1, Math.floor(guestItem.quantity || 1));

      const existingIndex = cart.items.findIndex(
        (item) => item.bookId.toString() === guestItem.bookId
      );

      if (existingIndex > -1) {
        cart.items[existingIndex].quantity = Math.max(
          cart.items[existingIndex].quantity,
          qty
        );
      } else {
        cart.items.push({
          bookId: guestItem.bookId as any,
          quantity: qty,
          addedAt: new Date(),
        });
      }
    } catch {
      // Ignore invalid guest item IDs
    }
  }

  await cart.save();
  return getCartService(userId);
}

export async function clearCartService(userId: string) {
  validateObjectId(userId, "User ID");
  await CartModel.findOneAndUpdate({ userId }, { $set: { items: [] } }, { upsert: true });
  return { items: [], totalQuantity: 0, subtotal: 0, grandTotal: 0 };
}
