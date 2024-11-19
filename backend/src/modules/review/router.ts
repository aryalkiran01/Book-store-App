import { Router } from "express";
import {
  addReviewController,
  updateReviewController,
  getReviewsByBookIdController,
} from "./controller";
import { checkAuth } from "../auth/middleware";

// Creating a review router for all review-related endpoints
function createReviewRouter() {
  const router = Router();

  // Route to add a review for a specific book
  router.post("/:bookId", checkAuth, addReviewController);

  // Route to update a specific review by reviewId (use PUT for update)
  router.put("/update/:reviewId", checkAuth, updateReviewController);  // Use PUT for update

  // Route to fetch all reviews for a specific book by bookId
  router.get("/:bookId", getReviewsByBookIdController);

  return router;
}

export const reviewRouter = createReviewRouter();
