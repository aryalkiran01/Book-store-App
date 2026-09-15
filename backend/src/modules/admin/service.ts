import axios from "axios";
import { UserModel } from "../auth/model";
import { BookModel } from "../book/model";
import { OrderModel } from "../order/model";
import { ReviewModel } from "../review/model";
import { APIError } from "../../utils/error";
import { validateObjectId } from "../../utils/security";
import { BookDiscoveryService } from "../book/provider";
import {
  TAdminQueryInput,
  TModerateReviewInput,
  TUpdateStockInput,
  TUpdateUserRoleInput,
  TImportOpenLibraryBookInput,
} from "./validation";
import { updateBookRatingAggregation } from "../review/service";

/**
 * High-level system statistics and KPI metrics for admin dashboard
 */
export async function getAdminStatsService() {
  const [
    totalUsers,
    totalBooks,
    totalOrders,
    pendingOrders,
    processingOrders,
    lowStockBooksCount,
    outOfStockBooksCount,
    revenueAggregation,
    orderStatusAggregation,
    recentOrders,
    recentReviews,
    topCategories,
  ] = await Promise.all([
    UserModel.countDocuments(),
    BookModel.countDocuments(),
    OrderModel.countDocuments(),
    OrderModel.countDocuments({ status: "pending" }),
    OrderModel.countDocuments({ status: "processing" }),
    BookModel.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
    BookModel.countDocuments({ stock: { $lte: 0 } }),
    OrderModel.aggregate([
      {
        $match: {
          status: { $in: ["confirmed", "processing", "shipped", "delivered"] },
          paymentStatus: { $ne: "refunded" },
        },
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: "$totalAmount" },
          avgOrderValue: { $avg: "$totalAmount" },
        },
      },
    ]),
    OrderModel.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$totalAmount" },
        },
      },
    ]),
    OrderModel.find()
      .populate("userId", "username email avatar")
      .populate("books.bookId", "title image price")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    ReviewModel.find()
      .populate("userId", "username email avatar")
      .populate("bookId", "title image")
      .sort({ createdAt: -1 })
      .limit(6)
      .lean(),
    BookModel.aggregate([
      {
        $group: {
          _id: "$genre",
          count: { $sum: 1 },
          totalStock: { $sum: "$stock" },
          avgPrice: { $avg: "$price" },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]),
  ]);

  const totalRevenue =
    revenueAggregation.length > 0 ? revenueAggregation[0].totalRevenue : 0;
  const avgOrderValue =
    revenueAggregation.length > 0
      ? Number(revenueAggregation[0].avgOrderValue.toFixed(2))
      : 0;

  // Build status breakdown map with defaults
  const statusMap: Record<string, number> = {
    pending: 0,
    confirmed: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0,
    refunded: 0,
  };

  for (const item of orderStatusAggregation) {
    if (item._id && typeof item._id === "string") {
      statusMap[item._id] = item.count;
    }
  }

  return {
    metrics: {
      totalUsers,
      totalBooks,
      totalOrders,
      totalRevenue,
      avgOrderValue,
      pendingOrders,
      processingOrders,
      lowStockBooksCount,
      outOfStockBooksCount,
    },
    orderStatusBreakdown: statusMap,
    recentOrders,
    recentReviews,
    topCategories,
  };
}

/**
 * Paginated and searchable users list
 */
export async function getAdminUsersService(query: TAdminQueryInput) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (query.search) {
    const s = query.search.trim();
    filter.$or = [
      { username: { $regex: s, $options: "i" } },
      { email: { $regex: s, $options: "i" } },
    ];
  }

  if (query.role && query.role !== "all") {
    filter.role = query.role;
  }

  const sort: any = { createdAt: query.sortOrder === "asc" ? 1 : -1 };

  const [total, users] = await Promise.all([
    UserModel.countDocuments(filter),
    UserModel.find(filter)
      .select("-password")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    users,
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

/**
 * Promote or demote user role
 */
export async function updateAdminUserRoleService(
  targetUserId: string,
  input: TUpdateUserRoleInput,
  requestingAdminId: string
) {
  validateObjectId(targetUserId, "User ID");

  const targetUser = await UserModel.findById(targetUserId);
  if (!targetUser) throw APIError.notFound("User not found");

  // Prevent self-demotion from admin
  if (targetUserId === requestingAdminId && input.role !== "admin") {
    throw APIError.badRequest("You cannot demote yourself from the admin role.");
  }

  targetUser.role = input.role;
  await targetUser.save();

  return {
    id: targetUser._id,
    username: targetUser.username,
    email: targetUser.email,
    role: targetUser.role,
  };
}

/**
 * Delete a user account (with self-deletion check)
 */
export async function deleteAdminUserService(
  targetUserId: string,
  requestingAdminId: string
) {
  validateObjectId(targetUserId, "User ID");

  if (targetUserId === requestingAdminId) {
    throw APIError.badRequest("You cannot delete your own admin account.");
  }

  const deletedUser = await UserModel.findByIdAndDelete(targetUserId);
  if (!deletedUser) throw APIError.notFound("User not found");

  return {
    id: deletedUser._id,
    username: deletedUser.username,
    email: deletedUser.email,
  };
}

/**
 * Specialized inventory management view
 */
export async function getAdminInventoryService(query: TAdminQueryInput) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (query.search) {
    const s = query.search.trim();
    filter.$or = [
      { title: { $regex: s, $options: "i" } },
      { author: { $regex: s, $options: "i" } },
      { isbn: { $regex: s, $options: "i" } },
    ];
  }

  if (query.genre && query.genre !== "all") {
    filter.genre = query.genre;
  }

  if (query.stockFilter === "out_of_stock") {
    filter.stock = { $lte: 0 };
  } else if (query.stockFilter === "low_stock") {
    filter.stock = { $gt: 0, $lte: 5 };
  } else if (query.stockFilter === "in_stock") {
    filter.stock = { $gt: 5 };
  }

  const sort: any = {};
  if (query.sortBy === "stock") {
    sort.stock = query.sortOrder === "asc" ? 1 : -1;
  } else if (query.sortBy === "price") {
    sort.price = query.sortOrder === "asc" ? 1 : -1;
  } else {
    sort.stock = 1; // Default to lowest stock first
  }

  const [total, books, lowStockCount, outOfStockCount] = await Promise.all([
    BookModel.countDocuments(filter),
    BookModel.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    BookModel.countDocuments({ stock: { $gt: 0, $lte: 5 } }),
    BookModel.countDocuments({ stock: { $lte: 0 } }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    books,
    summary: {
      totalProducts: total,
      lowStockCount,
      outOfStockCount,
    },
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

/**
 * Quick atomic stock adjustment
 */
export async function quickUpdateStockService(
  bookId: string,
  input: TUpdateStockInput
) {
  validateObjectId(bookId, "Book ID");

  const book = await BookModel.findByIdAndUpdate(
    bookId,
    { stock: input.stock },
    { new: true }
  );

  if (!book) throw APIError.notFound("Book not found");

  return book;
}

/**
 * Aggregated category & genre statistics
 */
export async function getAdminCategoriesService() {
  const categories = await BookModel.aggregate([
    {
      $group: {
        _id: { $ifNull: ["$genre", "Uncategorized"] },
        bookCount: { $sum: 1 },
        totalStock: { $sum: "$stock" },
        avgPrice: { $avg: "$price" },
        minPrice: { $min: "$price" },
        maxPrice: { $max: "$price" },
        featuredCount: {
          $sum: { $cond: [{ $eq: ["$featured", true] }, 1, 0] },
        },
      },
    },
    {
      $project: {
        genre: "$_id",
        bookCount: 1,
        totalStock: 1,
        avgPrice: { $round: ["$avgPrice", 2] },
        minPrice: 1,
        maxPrice: 1,
        featuredCount: 1,
      },
    },
    { $sort: { bookCount: -1 } },
  ]);

  return categories;
}

/**
 * Aggregated author statistics and directory
 */
export async function getAdminAuthorsService() {
  const authors = await BookModel.aggregate([
    {
      $group: {
        _id: { $ifNull: ["$author", "Unknown"] },
        bookCount: { $sum: 1 },
        totalStock: { $sum: "$stock" },
        genres: { $addToSet: "$genre" },
        avgRating: { $avg: "$averageRating" },
      },
    },
    {
      $project: {
        author: "$_id",
        bookCount: 1,
        totalStock: 1,
        genres: 1,
        avgRating: { $round: [{ $ifNull: ["$avgRating", 0] }, 1] },
      },
    },
    { $sort: { bookCount: -1 } },
  ]);

  return authors;
}

/**
 * Fetch all reviews with admin moderation filters
 */
export async function getAdminReviewsService(query: TAdminQueryInput) {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};

  if (query.status && query.status !== "all") {
    filter.status = query.status;
  }

  if (query.search) {
    const s = query.search.trim();
    filter.$or = [
      { reviewText: { $regex: s, $options: "i" } },
      { title: { $regex: s, $options: "i" } },
      { username: { $regex: s, $options: "i" } },
      { reportReason: { $regex: s, $options: "i" } },
    ];
  }

  const [total, reviews, flaggedCount] = await Promise.all([
    ReviewModel.countDocuments(filter),
    ReviewModel.find(filter)
      .populate("userId", "username email avatar")
      .populate("bookId", "title image author price")
      .populate("reportedBy", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ReviewModel.countDocuments({ status: "flagged" }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    reviews,
    flaggedCount,
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

/**
 * Moderate review status
 */
export async function moderateAdminReviewService(
  reviewId: string,
  input: TModerateReviewInput
) {
  validateObjectId(reviewId, "Review ID");

  const review = await ReviewModel.findById(reviewId);
  if (!review) throw APIError.notFound("Review not found");

  review.status = input.status;
  if (input.status === "published") {
    review.isReported = false;
  }
  await review.save();

  // Recalculate rating aggregates for the associated book
  await updateBookRatingAggregation(review.bookId.toString());

  return review;
}

/**
 * Delete review permanently
 */
export async function deleteAdminReviewService(reviewId: string) {
  validateObjectId(reviewId, "Review ID");

  const review = await ReviewModel.findByIdAndDelete(reviewId);
  if (!review) throw APIError.notFound("Review not found");

  await updateBookRatingAggregation(review.bookId.toString());

  return review;
}

export interface OpenLibrarySearchResult {
  googleBooksId?: string;
  openLibraryId: string;
  title: string;
  author: string;
  isbn: string;
  coverId: string;
  coverUrl: string;
  firstPublishYear?: number | string;
  genre: string;
  pages: number;
  publisher: string;
  language: string;
  suggestedPriceNPR: number;
  source?: string;
  isAlreadyImported?: boolean;
  existingBookId?: string;
}

export interface CachedSearchEntry {
  candidates: Array<Omit<OpenLibrarySearchResult, "isAlreadyImported" | "existingBookId">>;
  total: number;
  cachedAt: number;
}

// Bounded in-memory cache for external search responses
export const OPEN_LIBRARY_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OPEN_LIBRARY_CACHE_ENTRIES = 200;

const openLibrarySearchCache = new Map<string, CachedSearchEntry>();

export function getOpenLibraryCacheStats() {
  return {
    size: openLibrarySearchCache.size,
    maxEntries: MAX_OPEN_LIBRARY_CACHE_ENTRIES,
    ttlMs: OPEN_LIBRARY_CACHE_TTL_MS,
  };
}

export function clearOpenLibraryCache() {
  openLibrarySearchCache.clear();
}

export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Searches external book APIs (Google Books primary -> Open Library fallback) for free metadata and covers for admin import.
 */
export async function searchOpenLibraryBooksService(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{ books: OpenLibrarySearchResult[]; total: number }> {
  if (!query || !query.trim()) {
    return { books: [], total: 0 };
  }

  const cleanQuery = query.trim();
  const normalizedQuery = normalizeSearchQuery(cleanQuery);
  const targetPage = Math.max(1, page);
  const targetLimit = Math.min(50, Math.max(1, limit));
  const cacheKey = `admin_search:${normalizedQuery}:p${targetPage}:l${targetLimit}`;

  const now = Date.now();
  const cached = openLibrarySearchCache.get(cacheKey);

  let mappedCandidates: Array<
    Omit<OpenLibrarySearchResult, "isAlreadyImported" | "existingBookId">
  >;
  let total: number;

  if (cached && now - cached.cachedAt < OPEN_LIBRARY_CACHE_TTL_MS) {
    mappedCandidates = cached.candidates;
    total = cached.total;
  } else {
    try {
      const discoveryResult = await BookDiscoveryService.searchBooks(cleanQuery, targetPage, targetLimit);
      total = discoveryResult.total;

      mappedCandidates = discoveryResult.books.map((b) => ({
        googleBooksId: b.googleBooksId || "",
        openLibraryId: b.openLibraryId || "",
        title: b.title || "Untitled Book",
        author: b.author || "Unknown Author",
        isbn: b.isbn || "",
        coverId: b.coverId || "",
        coverUrl: b.image || "",
        firstPublishYear: b.firstPublishYear,
        genre: b.genre || "Fiction",
        pages: b.pages || 0,
        publisher: b.publisher || "",
        language: b.language || "English",
        suggestedPriceNPR: b.price || 799,
        source: b.source || "google_books",
      }));

      if (openLibrarySearchCache.size >= MAX_OPEN_LIBRARY_CACHE_ENTRIES) {
        const oldestKey = openLibrarySearchCache.keys().next().value;
        if (oldestKey) openLibrarySearchCache.delete(oldestKey);
      }

      openLibrarySearchCache.set(cacheKey, {
        candidates: mappedCandidates,
        total,
        cachedAt: now,
      });
    } catch (error: any) {
      console.warn("Admin external book search warning:", error.message);
      return { books: [], total: 0 };
    }
  }

  // Check existing books in MongoDB to mark isAlreadyImported in real-time
  const isbns = mappedCandidates.map((b) => b.isbn).filter(Boolean);
  const gids = mappedCandidates.map((b) => b.googleBooksId).filter(Boolean);
  const olids = mappedCandidates.map((b) => b.openLibraryId).filter(Boolean);
  const titleAuthorPairs = mappedCandidates
    .filter((b) => b.title && b.author)
    .map((b) => ({ title: b.title.trim(), author: b.author.trim() }));

  const orClauses: any[] = [];
  if (isbns.length > 0) orClauses.push({ isbn: { $in: isbns } });
  if (gids.length > 0) orClauses.push({ googleBooksId: { $in: gids } });
  if (olids.length > 0) orClauses.push({ openLibraryId: { $in: olids } });
  for (const p of titleAuthorPairs) {
    orClauses.push({ title: p.title, author: p.author });
  }

  const existingBooks =
    orClauses.length > 0
      ? await BookModel.find({ $or: orClauses })
          .select("_id title author isbn googleBooksId openLibraryId")
          .lean()
      : [];

  const existingMap = new Map<string, string>(); // identifier -> _id
  for (const eb of existingBooks) {
    const idStr = eb._id.toString();
    if (eb.isbn) existingMap.set(`isbn:${eb.isbn}`, idStr);
    if ((eb as any).googleBooksId) existingMap.set(`gid:${(eb as any).googleBooksId}`, idStr);
    if (eb.openLibraryId) existingMap.set(`olid:${eb.openLibraryId}`, idStr);
    if (eb.title && eb.author) {
      existingMap.set(
        `title_author:${eb.title.toLowerCase().trim()}:::${eb.author.toLowerCase().trim()}`,
        idStr
      );
    }
  }

  const books: OpenLibrarySearchResult[] = mappedCandidates.map((c) => {
    let existingBookId: string | undefined;

    if (c.isbn && existingMap.has(`isbn:${c.isbn}`)) {
      existingBookId = existingMap.get(`isbn:${c.isbn}`);
    } else if (c.googleBooksId && existingMap.has(`gid:${c.googleBooksId}`)) {
      existingBookId = existingMap.get(`gid:${c.googleBooksId}`);
    } else if (c.openLibraryId && existingMap.has(`olid:${c.openLibraryId}`)) {
      existingBookId = existingMap.get(`olid:${c.openLibraryId}`);
    } else if (
      c.title &&
      c.author &&
      existingMap.has(
        `title_author:${c.title.toLowerCase().trim()}:::${c.author.toLowerCase().trim()}`
      )
    ) {
      existingBookId = existingMap.get(
        `title_author:${c.title.toLowerCase().trim()}:::${c.author.toLowerCase().trim()}`
      );
    }

    return {
      ...c,
      isAlreadyImported: Boolean(existingBookId),
      existingBookId,
    };
  });

  return { books, total };
}

/**
 * Imports an external book into MongoDB with duplicate protection and customizable pricing/stock.
 */
export async function importOpenLibraryBookService(
  input: TImportOpenLibraryBookInput
) {
  const cleanTitle = input.title.trim();
  const cleanAuthor = input.author.trim();
  const cleanIsbn = input.isbn?.trim() || "";
  const cleanGid = input.googleBooksId?.trim() || "";
  const cleanOlid = input.openLibraryId?.trim() || "";

  // 1. Duplicate check in MongoDB
  const orClauses: any[] = [];
  if (cleanIsbn) orClauses.push({ isbn: cleanIsbn });
  if (cleanGid) orClauses.push({ googleBooksId: cleanGid });
  if (cleanOlid) orClauses.push({ openLibraryId: cleanOlid });
  if (cleanTitle && cleanAuthor) {
    orClauses.push({ title: cleanTitle, author: cleanAuthor });
  } else if (cleanTitle) {
    orClauses.push({ title: cleanTitle });
  }

  const existingBook = orClauses.length > 0 ? await BookModel.findOne({ $or: orClauses }) : null;
  if (existingBook) {
    return {
      book: existingBook,
      isNew: false,
      message: `"${existingBook.title}" by ${existingBook.author} is already in the catalog.`,
    };
  }

  // 2. Resolve image URL
  let resolvedImage = input.image?.trim();
  if (!resolvedImage) {
    if (cleanIsbn) {
      resolvedImage = `https://covers.openlibrary.org/b/isbn/${cleanIsbn}-L.jpg`;
    } else if (input.coverId) {
      resolvedImage = `https://covers.openlibrary.org/b/id/${input.coverId}-L.jpg`;
    } else if (cleanOlid) {
      resolvedImage = `https://covers.openlibrary.org/b/olid/${cleanOlid}-L.jpg`;
    } else {
      resolvedImage = "";
    }
  }

  // 3. Create and persist to MongoDB
  const newBook = await BookModel.create({
    title: cleanTitle,
    author: input.author.trim(),
    genre: input.genre?.trim() || "Fiction",
    description:
      input.description?.trim() ||
      `An acclaimed literary work by ${input.author.trim()}.`,
    image: resolvedImage,
    price: Math.max(0, Number(input.price) || 799),
    discountPercentage: Math.min(100, Math.max(0, Number(input.discountPercentage) || 0)),
    stock: Math.max(0, Number(input.stock) || 20),
    isbn: cleanIsbn,
    googleBooksId: cleanGid,
    openLibraryId: cleanOlid,
    coverId: input.coverId?.trim() || "",
    publisher: input.publisher?.trim() || "",
    publicationDate: input.publicationDate?.trim() || "",
    pages: Math.max(0, Number(input.pages) || 0),
    language: input.language?.trim() || "English",
    featured: Boolean(input.featured),
    isNewArrival: input.isNewArrival !== undefined ? Boolean(input.isNewArrival) : true,
    source: input.source || (cleanGid ? "google_books" : cleanOlid ? "openlibrary" : "manual"),
    isAvailableInStore: true,
  });

  return {
    book: newBook,
    isNew: true,
    message: `"${newBook.title}" has been successfully imported into the store catalog.`,
  };
}


