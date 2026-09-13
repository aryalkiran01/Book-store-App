import { Router } from "express";
import { checkAuth } from "../auth/middleware";
import {
  addReviewController,
  deleteReviewController,
  getAllReviewsController,
  getReviewsByBookIdController,
  updateReviewController,
} from "./controller";

function createReviewRouter() {
  const router = Router();

  // Get all reviews
  router.get("/", getAllReviewsController);

  // Add review
  router.post("/addReview/:bookId", checkAuth, addReviewController);
  router.post("/:bookId", checkAuth, addReviewController);

  // Update review (support PUT and POST)
  router.put("/updateReview/:reviewId", checkAuth, updateReviewController);
  router.post("/updateReview/:reviewId", checkAuth, updateReviewController);
  router.put("/:reviewId", checkAuth, updateReviewController);
  router.post("/:reviewId", checkAuth, updateReviewController);

  // Delete review
  router.delete("/deleteReview/:reviewId", checkAuth, deleteReviewController);
  router.delete("/:reviewId", checkAuth, deleteReviewController);

  // Get reviews by bookId
  router.get("/getReview/:bookId", getReviewsByBookIdController);
  router.get("/:bookId", getReviewsByBookIdController);

  return router;
}

export const reviewRouter = createReviewRouter();

