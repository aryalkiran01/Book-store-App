import { Router } from "express";
import {
  clearWishlistController,
  getWishlistController,
  removeFromWishlistController,
  syncWishlistController,
  toggleWishlistController,
} from "./controller";
import { checkAuth } from "../auth/middleware";

function createWishlistRouter() {
  const router = Router();

  router.use(checkAuth);

  router.get("/", getWishlistController);
  router.post("/toggle/:bookId", toggleWishlistController);
  router.post("/:bookId", toggleWishlistController);
  router.delete("/:bookId", removeFromWishlistController);
  router.post("/sync", syncWishlistController);
  router.delete("/", clearWishlistController);

  return router;
}

export const wishlistRouter = createWishlistRouter();
