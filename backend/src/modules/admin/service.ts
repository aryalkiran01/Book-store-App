import { UserModel } from "../auth/model";
import { BookModel } from "../book/model";
import { OrderModel } from "../order/model";
import { ReviewModel } from "../review/model";
import { APIError } from "../../utils/error";
import { validateObjectId } from "../../utils/security";
import {
  TAdminQueryInput,
  TModerateReviewInput,
  TUpdateStockInput,
  TUpdateUserRoleInput,
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
