import { Router } from "express";
import { checkAuth } from "../auth/middleware";
import {
  addReviewController,
  deleteReviewController,
  getReviewsByBookIdController,
  updateReviewController,
} from "./controller";

function createReviewRouter() {
  const router = Router();

  router.post("/addReview/:bookId", checkAuth, addReviewController);
  router.post("/updateReview/:reviewId", checkAuth, updateReviewController);
  router.delete("/deleteReview/:reviewId", checkAuth, deleteReviewController);
  router.get("/getReview/:bookId", getReviewsByBookIdController);

  return router;
}
export const reviewRouter = createReviewRouter();
