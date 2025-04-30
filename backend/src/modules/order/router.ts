import { Router } from "express";
import {
  createOrderController,
  deleteOrderController,
  getOrderByIdController,
  getOrdersByUserController,
  updateOrderStatusController,
} from "./controller";
import { checkAuth } from "../auth/middleware";

function createOrderRouter() {
  const router = Router();

  router.post("/", checkAuth, createOrderController); // Place an order
  router.get("/user/:userId", checkAuth, getOrdersByUserController);
  router.get("/:orderId", checkAuth, getOrderByIdController);
  router.patch("/:orderId", checkAuth, updateOrderStatusController); // Update order status
  router.delete("/:orderId", checkAuth, deleteOrderController); // Delete order

  return router;
}

export const orderRouter = createOrderRouter();
