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
  getSearchSuggestionsController,
  updateBookController,
} from "./controller";
import { checkAdmin, checkAuth } from "../auth/middleware";

function createBookRouter() {
  const router = Router();
  router.get("/", getBooksController);
  router.get("/suggestions", getSearchSuggestionsController);
  router.get("/genres", getGenresController);
  router.get("/featured", getFeaturedBooksController);
  router.get("/new-arrivals", getNewArrivalsController);
  router.get("/homepage-feeds", getHomepageFeedsController);
  router.get("/:bookId", getBookByIdController);

  router.post("/", checkAuth, checkAdmin, addBookController);
  router.put("/:bookId", checkAuth, checkAdmin, updateBookController);
  router.post("/:bookId", checkAuth, checkAdmin, updateBookController);
  router.delete("/:bookId", checkAuth, checkAdmin, deleteBookController);

  return router;
}

export const bookRouter = createBookRouter();

