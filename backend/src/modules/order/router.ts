import { Router } from "express";
import {
  cancelOrderController,
  createOrderController,
  deleteOrderController,
  getAllOrdersController,
  getMyOrdersController,
  getOrderByIdController,
  getOrdersByUserController,
  requestRefundController,
  updateOrderShippingController,
  updateOrderStatusController,
  validateCartController,
  getOrderInvoiceController,
  getOrderInvoiceHtmlController,
} from "./controller";
import { checkAdmin, checkAuth } from "../auth/middleware";
import { checkoutRateLimiter } from "../../utils/security";

function createOrderRouter() {
  const router = Router();

  // Public cart calculation & live stock validation
  router.post("/validate-cart", validateCartController);
  router.post("/preview", validateCartController);

  // Admin routes
  router.get("/admin/all", checkAuth, checkAdmin, getAllOrdersController);

  // User & Order routes
  router.post("/", checkAuth, checkoutRateLimiter, createOrderController);
  router.get("/my-orders", checkAuth, getMyOrdersController);
  router.get("/user/:userId", checkAuth, getOrdersByUserController);
  router.get("/:orderId/invoice/html", checkAuth, getOrderInvoiceHtmlController);
  router.get("/:orderId/invoice", checkAuth, getOrderInvoiceController);
  router.get("/:orderId", checkAuth, getOrderByIdController);
  router.post("/:orderId/cancel", checkAuth, cancelOrderController);
  router.post("/:orderId/refund", checkAuth, requestRefundController);
  router.patch("/:orderId/shipping", checkAuth, checkAdmin, updateOrderShippingController);
  router.patch("/:orderId/status", checkAuth, checkAdmin, updateOrderStatusController);
  router.patch("/:orderId", checkAuth, checkAdmin, updateOrderStatusController);
  router.put("/:orderId", checkAuth, checkAdmin, updateOrderStatusController);
  router.delete("/:orderId", checkAuth, checkAdmin, deleteOrderController);

  return router;
}

export const orderRouter = createOrderRouter();

