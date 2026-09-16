import { Router } from "express";
import {
  addBookController,
  deleteBookController,
  getBookByIdController,
  getBooksController,
  getFeaturedBooksController,
  getGenresController,
  getHomepageFeedsController,
  getNewArrivalsController,
  getRecommendationsController,
  getSearchSuggestionsController,
  updateBookController,
} from "./controller";
import { checkAdmin, checkAuth } from "../auth/middleware";
import { searchRateLimiter } from "../../utils/security";

function createBookRouter() {
  const router = Router();
  router.get("/", searchRateLimiter, getBooksController);
  router.get("/suggestions", searchRateLimiter, getSearchSuggestionsController);
  router.get("/genres", getGenresController);
  router.get("/featured", getFeaturedBooksController);
  router.get("/new-arrivals", getNewArrivalsController);
  router.get("/homepage-feeds", getHomepageFeedsController);
  router.get("/:bookId/recommendations", getRecommendationsController);
  router.get("/:bookId", getBookByIdController);

  router.post("/", checkAuth, checkAdmin, addBookController);
  router.put("/:bookId", checkAuth, checkAdmin, updateBookController);
  router.post("/:bookId", checkAuth, checkAdmin, updateBookController);
  router.delete("/:bookId", checkAuth, checkAdmin, deleteBookController);

  return router;
}

export const bookRouter = createBookRouter();

