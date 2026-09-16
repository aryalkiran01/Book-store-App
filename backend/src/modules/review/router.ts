import { Router } from "express";
import { checkAuth, checkAdmin } from "../auth/middleware";
import {
  addReviewController,
  deleteReviewController,
  getAllReviewsController,
  getReviewsByBookIdController,
  updateReviewController,
  toggleHelpfulReviewController,
  reportReviewController,
  moderateReviewController,
  getReviewReportsController,
  resolveReviewReportController,
} from "./controller";

function createReviewRouter() {
  const router = Router();

  // 1. Get all reviews (supports ?page=&limit=&status=)
  router.get("/", getAllReviewsController);

  // Admin reports moderation dashboard
  router.get("/admin/reports", checkAuth, checkAdmin, getReviewReportsController);
  router.patch("/admin/reports/:reportId", checkAuth, checkAdmin, resolveReviewReportController);

  // 2. Add review for a book
  router.post("/addReview/:bookId", checkAuth, addReviewController);
  router.post("/:bookId", checkAuth, addReviewController);

  // 3. Helpful vote toggle
  router.post("/:reviewId/helpful", checkAuth, toggleHelpfulReviewController);

  // 4. Report / Flag review
  router.post("/:reviewId/report", checkAuth, reportReviewController);

  // 5. Admin review moderation
  router.patch("/:reviewId/moderate", checkAuth, checkAdmin, moderateReviewController);

  // 6. Update review
  router.put("/updateReview/:reviewId", checkAuth, updateReviewController);
  router.put("/:reviewId", checkAuth, updateReviewController);
  router.post("/updateReview/:reviewId", checkAuth, updateReviewController);
  router.post("/:reviewId/update", checkAuth, updateReviewController);

  // 7. Delete review
  router.delete("/deleteReview/:reviewId", checkAuth, deleteReviewController);
  router.delete("/:reviewId", checkAuth, deleteReviewController);

  // 8. Get reviews by bookId (supports ?page=&limit=&sortBy=&ratingFilter=&verifiedOnly=)
  router.get("/getReview/:bookId", getReviewsByBookIdController);
  router.get("/:bookId", getReviewsByBookIdController);

  return router;
}

export const reviewRouter = createReviewRouter();
