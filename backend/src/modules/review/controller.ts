import { Request, Response, NextFunction } from "express";
import { APIError } from "src/utils/error";
import {
  AddReviewControllerSchema,
  UpdateReviewControllerSchema,
} from "./validation";
import {
  createReviewService,
  deleteReviewService,
  getReviewsByBookIdService,
  updateReviewService,
} from "./service";

export async function addReviewController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = req.body;
    const bookId = req.params.bookId;
    const userId = req.user.id;

    const { success, error, data } = AddReviewControllerSchema.safeParse(body);
    if (!success) {
      const errors = error.flatten().fieldErrors;
      res.status(400).json({
        message: "Invalid request",
        data: null,
        isSuccess: false,
        errors: errors,
      });
      return;
    }

    const review = await createReviewService(
      {
        userId,
        bookId,  // Pass bookId here
      },
      data
    );

    res.status(201).json({
      message: "Review created successfully",
      isSuccess: true,
      data: review,
    });
  } catch (error) {
    if (error instanceof APIError) {
      next(error);
    } else {
      next(new APIError(500, (error as Error).message));
    }
  }
}

export async function updateReviewController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = req.body;

    const userId = req.user.id;
    const reviewId = req.params.reviewId;
    const bookId = req.body.bookId; // Assuming the bookId is passed in the request body

    const { success, error, data } =
      UpdateReviewControllerSchema.safeParse(body);
    if (!success) {
      const errors = error.flatten().fieldErrors;
      res.status(400).json({
        message: "Invalid request",
        data: null,
        isSuccess: false,
        errors: errors,
      });
      return;
    }

    const review = await updateReviewService(
      reviewId,
      {
        userId,
        bookId,  // Pass bookId here
      },
      data
    );

    res.status(201).json({
      message: "Review updated successfully",
      isSuccess: true,
      data: review,
    });
  } catch (error) {
    if (error instanceof APIError) {
      next(error);
    } else {
      next(new APIError(500, (error as Error).message));
    }
  }
}

export async function deleteReviewController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const reviewId = req.params.reviewId;

    const userId = req.user.id;

    const review = await deleteReviewService(reviewId, {
      userId,  // Ensure userId is passed here
      bookId: "",  // If bookId is not needed for deletion, leave it empty or modify the logic
    });

    res.status(201).json({
      message: "Review deleted successfully",
      isSuccess: true,
      data: review,
    });
  } catch (error) {
    if (error instanceof APIError) {
      next(error);
    } else {
      next(new APIError(500, (error as Error).message));
    }
  }
}

export async function getReviewsByBookIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const bookId = req.params.bookId;

    const reviews = await getReviewsByBookIdService(bookId);
    res.status(200).json({
      message: "Reviews retrieved successfully",
      isSuccess: true,
      data: reviews,
    });
  } catch (error) {
    if (error instanceof APIError) {
      next(error);
    } else {
      next(new APIError(500, (error as Error).message));
    }
  }
}
