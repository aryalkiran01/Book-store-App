import { Router } from "express";
import {
  addToCartController,
  clearCartController,
  getCartController,
  removeFromCartController,
  syncCartController,
  updateCartItemController,
} from "./controller";
import { checkAuth } from "../auth/middleware";

function createCartRouter() {
  const router = Router();

  router.use(checkAuth);

  router.get("/", getCartController);
  router.post("/items", addToCartController);
  router.post("/add", addToCartController);
  router.put("/items/:bookId", updateCartItemController);
  router.patch("/items/:bookId", updateCartItemController);
  router.delete("/items/:bookId", removeFromCartController);
  router.post("/sync", syncCartController);
  router.delete("/", clearCartController);

  return router;
}

export const cartRouter = createCartRouter();
