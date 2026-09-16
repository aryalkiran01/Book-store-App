import { WishlistModel } from "./model";
import { BookModel } from "../book/model";
import { validateObjectId } from "../../utils/security";
import { APIError } from "../../utils/error";

export async function getWishlistService(userId: string) {
  validateObjectId(userId, "User ID");

  let wishlist = await WishlistModel.findOne({ userId }).populate({
    path: "books",
    match: { isDeleted: { $ne: true }, isActive: { $ne: false } },
    select: "title author genre price discountPercentage image averageRating rating stock reservedStock",
  });

  if (!wishlist) {
    wishlist = await WishlistModel.create({ userId, books: [] });
  }

  return {
    books: wishlist.books || [],
    totalItems: wishlist.books?.length || 0,
  };
}

export async function toggleWishlistItemService(userId: string, bookId: string) {
  validateObjectId(userId, "User ID");
  validateObjectId(bookId, "Book ID");

  const book = await BookModel.findOne({
    _id: bookId,
    isDeleted: { $ne: true },
    isActive: { $ne: false },
  });

  if (!book) {
    throw APIError.notFound("Book not found in store catalog");
  }

  let wishlist = await WishlistModel.findOne({ userId });
  if (!wishlist) {
    wishlist = new WishlistModel({ userId, books: [] });
  }

  const existingIndex = wishlist.books.findIndex(
    (b: any) => b.toString() === bookId
  );

  let isAdded = false;
  if (existingIndex > -1) {
    wishlist.books.splice(existingIndex, 1);
    isAdded = false;
  } else {
    wishlist.books.push(book._id as any);
    isAdded = true;
  }

  await wishlist.save();

  return {
    isAdded,
    message: isAdded ? "Added to wishlist" : "Removed from wishlist",
    wishlist: await getWishlistService(userId),
  };
}

export async function removeFromWishlistService(userId: string, bookId: string) {
  validateObjectId(userId, "User ID");
  validateObjectId(bookId, "Book ID");

  const wishlist = await WishlistModel.findOne({ userId });
  if (wishlist) {
    wishlist.books = wishlist.books.filter((b: any) => b.toString() !== bookId);
    await wishlist.save();
  }

  return getWishlistService(userId);
}

export async function syncGuestWishlistService(userId: string, bookIds: string[]) {
  validateObjectId(userId, "User ID");

  if (!bookIds || !Array.isArray(bookIds) || bookIds.length === 0) {
    return getWishlistService(userId);
  }

  let wishlist = await WishlistModel.findOne({ userId });
  if (!wishlist) {
    wishlist = new WishlistModel({ userId, books: [] });
  }

  const currentBookIdSet = new Set(wishlist.books.map((b: any) => b.toString()));

  for (const id of bookIds) {
    if (id && !currentBookIdSet.has(id)) {
      try {
        validateObjectId(id, "Book ID");
        wishlist.books.push(id as any);
        currentBookIdSet.add(id);
      } catch {
        // Skip invalid IDs
      }
    }
  }

  await wishlist.save();
  return getWishlistService(userId);
}

export async function clearWishlistService(userId: string) {
  validateObjectId(userId, "User ID");
  await WishlistModel.findOneAndUpdate({ userId }, { $set: { books: [] } }, { upsert: true });
  return { books: [], totalItems: 0 };
}
