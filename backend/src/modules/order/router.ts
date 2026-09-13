import { Router } from "express";
import {
  createOrderController,
  deleteOrderController,
  getAllOrdersController,
  getOrderByIdController,
  getOrdersByUserController,
  updateOrderStatusController,
  validateCartController,
} from "./controller";
import { checkAdmin, checkAuth } from "../auth/middleware";

function createOrderRouter() {
  const router = Router();

  // Public cart calculation & live stock validation
  router.post("/validate-cart", validateCartController);
  router.post("/preview", validateCartController);

  // Admin routes
  router.get("/admin/all", checkAuth, checkAdmin, getAllOrdersController);

  // User & Order routes
  router.post("/", checkAuth, createOrderController);
  router.get("/user/:userId", checkAuth, getOrdersByUserController);
  router.get("/:orderId", checkAuth, getOrderByIdController);
  router.patch("/:orderId", checkAuth, checkAdmin, updateOrderStatusController);
  router.put("/:orderId", checkAuth, checkAdmin, updateOrderStatusController);
  router.delete("/:orderId", checkAuth, checkAdmin, deleteOrderController);

  return router;
}

export const orderRouter = createOrderRouter();
