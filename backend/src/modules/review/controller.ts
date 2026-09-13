import { Request, Response, NextFunction } from "express";
import {
  AddReviewControllerSchema,
  UpdateReviewControllerSchema,
  ReportReviewSchema,
  TReviewCtx,
} from "./validation";
import {
  createReviewService,
  updateReviewService,
  getReviewsByBookIdService,
  deleteReviewService,
  getAllReviewsService,
  toggleHelpfulService,
  reportReviewService,
  adminModerateReviewService,
} from "./service";

interface ReviewParams {
  bookId?: string;
  reviewId?: string;
}

// Get All Reviews (with pagination & optional status filter)
export const getAllReviewsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page, limit, status } = req.query;
    const result = await getAllReviewsService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status: typeof status === "string" ? status : undefined,
    });
    res.status(200).json({
      message: "Reviews fetched successfully",
      isSuccess: true,
      data: result.reviews,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Add / Upsert Review Controller
export const addReviewController = async (
  req: Request<ReviewParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { success, error, data } = AddReviewControllerSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        message: "Invalid review input",
        isSuccess: false,
        data: null,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const bookId = req.params.bookId;
    if (!bookId) {
      res.status(400).json({
        message: "Book ID is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const ctx: TReviewCtx = {
      userId: req.user.id,
      bookId,
      role: req.user.role,
    };

    const review = await createReviewService(ctx, {
      ...data,
      username: req.user.username,
      userAvatar: req.user.avatar,
    });

    res.status(201).json({
      message: "Review submitted successfully",
      isSuccess: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

// Update Review Controller
export const updateReviewController = async (
  req: Request<ReviewParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { success, error, data } = UpdateReviewControllerSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        message: "Invalid update input",
        isSuccess: false,
        data: null,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const reviewId = req.params.reviewId;
    if (!reviewId) {
      res.status(400).json({
        message: "Review ID is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const ctx: TReviewCtx = {
      userId: req.user.id,
      bookId: "",
      role: req.user.role,
    };

    const updatedReview = await updateReviewService(reviewId, ctx, data);

    res.status(200).json({
      message: "Review updated successfully",
      isSuccess: true,
      data: updatedReview,
    });
  } catch (error) {
    next(error);
  }
};

// Get Reviews by Book ID Controller (with sorting, filters, stats, pagination)
export const getReviewsByBookIdController = async (
  req: Request<ReviewParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const bookId = req.params.bookId;
    if (!bookId) {
      res.status(400).json({
        message: "Book ID is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const { page, limit, sortBy, ratingFilter, verifiedOnly } = req.query;

    const result = await getReviewsByBookIdService(bookId, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: typeof sortBy === "string" ? (sortBy as any) : undefined,
      ratingFilter: ratingFilter ? Number(ratingFilter) : undefined,
      verifiedOnly: verifiedOnly === "true",
    });

    res.status(200).json({
      message: "Reviews fetched successfully",
      isSuccess: true,
      data: result.reviews,
      stats: result.stats,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Review Controller
export const deleteReviewController = async (
  req: Request<ReviewParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId;
    if (!reviewId) {
      res.status(400).json({
        message: "Review ID is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const ctx: TReviewCtx = {
      userId: req.user.id,
      bookId: "",
      role: req.user.role,
    };

    const deletedReview = await deleteReviewService(reviewId, ctx);

    res.status(200).json({
      message: "Review deleted successfully",
      isSuccess: true,
      data: deletedReview,
    });
  } catch (error) {
    next(error);
  }
};

// Toggle Helpful Vote Controller
export const toggleHelpfulReviewController = async (
  req: Request<ReviewParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId;
    if (!reviewId) {
      res.status(400).json({
        message: "Review ID is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const result = await toggleHelpfulService(reviewId, req.user.id);

    res.status(200).json({
      message: result.hasVotedHelpful
        ? "Marked review as helpful"
        : "Removed helpful mark",
      isSuccess: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Report Review Controller
export const reportReviewController = async (
  req: Request<ReviewParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId;
    if (!reviewId) {
      res.status(400).json({
        message: "Review ID is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const { success, error, data } = ReportReviewSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        message: "Invalid report reason",
        isSuccess: false,
        data: null,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const result = await reportReviewService(reviewId, req.user.id, data.reason);

    res.status(200).json({
      message: result.message,
      isSuccess: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// Admin Moderation Controller
export const moderateReviewController = async (
  req: Request<ReviewParams>,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const reviewId = req.params.reviewId;
    const { status } = req.body;

    if (!["published", "flagged", "hidden"].includes(status)) {
      res.status(400).json({
        message: "Invalid moderation status (must be published, flagged, or hidden)",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const review = await adminModerateReviewService(reviewId!, status);

    res.status(200).json({
      message: `Review marked as ${status}`,
      isSuccess: true,
      data: review,
    });
  } catch (error) {
    next(error);
  }
};
