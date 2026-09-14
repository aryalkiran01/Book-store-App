import { Request, Response, NextFunction } from "express";
import {
  AdminQuerySchema,
  ModerateReviewSchema,
  UpdateStockSchema,
  UpdateUserRoleSchema,
} from "./validation";
import {
  deleteAdminReviewService,
  deleteAdminUserService,
  getAdminAuthorsService,
  getAdminCategoriesService,
  getAdminInventoryService,
  getAdminReviewsService,
  getAdminStatsService,
  getAdminUsersService,
  moderateAdminReviewService,
  quickUpdateStockService,
  searchOpenLibraryBooksService,
  updateAdminUserRoleService,
} from "./service";

export async function getAdminStatsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const stats = await getAdminStatsService();
    res.status(200).json({
      message: "Admin statistics fetched successfully",
      isSuccess: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminUsersController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { success, data, error } = AdminQuerySchema.safeParse(req.query);
    if (!success) {
      res.status(400).json({
        message: "Invalid query parameters",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const result = await getAdminUsersService(data);
    res.status(200).json({
      message: "Users fetched successfully",
      isSuccess: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateAdminUserRoleController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.params.userId;
    const { success, data, error } = UpdateUserRoleSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({
        message: "Invalid role payload",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const updatedUser = await updateAdminUserRoleService(
      userId,
      data,
      req.user.id
    );

    res.status(200).json({
      message: "User role updated successfully",
      isSuccess: true,
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.params.userId;
    const deletedUser = await deleteAdminUserService(userId, req.user.id);

    res.status(200).json({
      message: "User deleted successfully",
      isSuccess: true,
      data: deletedUser,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminInventoryController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { success, data, error } = AdminQuerySchema.safeParse(req.query);
    if (!success) {
      res.status(400).json({
        message: "Invalid query parameters",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const result = await getAdminInventoryService(data);
    res.status(200).json({
      message: "Inventory fetched successfully",
      isSuccess: true,
      data: result.books,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function quickUpdateStockController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const bookId = req.params.bookId;
    const { success, data, error } = UpdateStockSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({
        message: "Invalid stock value",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const updatedBook = await quickUpdateStockService(bookId, data);

    res.status(200).json({
      message: "Stock updated successfully",
      isSuccess: true,
      data: updatedBook,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminCategoriesController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const categories = await getAdminCategoriesService();
    res.status(200).json({
      message: "Categories analytics fetched successfully",
      isSuccess: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminAuthorsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const authors = await getAdminAuthorsService();
    res.status(200).json({
      message: "Authors analytics fetched successfully",
      isSuccess: true,
      data: authors,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAdminReviewsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { success, data, error } = AdminQuerySchema.safeParse(req.query);
    if (!success) {
      res.status(400).json({
        message: "Invalid query parameters",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const result = await getAdminReviewsService(data);
    res.status(200).json({
      message: "Reviews fetched successfully",
      isSuccess: true,
      data: result.reviews,
      flaggedCount: result.flaggedCount,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function moderateAdminReviewController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const reviewId = req.params.reviewId;
    const { success, data, error } = ModerateReviewSchema.safeParse(req.body);

    if (!success) {
      res.status(400).json({
        message: "Invalid moderation status",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const review = await moderateAdminReviewService(reviewId, data);
    res.status(200).json({
      message: "Review moderated successfully",
      isSuccess: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteAdminReviewController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const reviewId = req.params.reviewId;
    const review = await deleteAdminReviewService(reviewId);

    res.status(200).json({
      message: "Review deleted permanently",
      isSuccess: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
}

export async function searchOpenLibraryBooksController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const query = String(req.query.query || req.query.q || req.query.search || "").trim();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const result = await searchOpenLibraryBooksService(query, page, limit);

    res.status(200).json({
      message: "Open Library search results fetched successfully",
      isSuccess: true,
      data: result.books,
      total: result.total,
      page,
      limit,
    });
  } catch (error) {
    next(error);
  }
}

