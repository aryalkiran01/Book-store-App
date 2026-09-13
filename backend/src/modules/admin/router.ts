import { Router } from "express";
import { checkAdmin, checkAuth } from "../auth/middleware";
import {
  deleteAdminReviewController,
  deleteAdminUserController,
  getAdminAuthorsController,
  getAdminCategoriesController,
  getAdminInventoryController,
  getAdminReviewsController,
  getAdminStatsController,
  getAdminUsersController,
  moderateAdminReviewController,
  quickUpdateStockController,
  updateAdminUserRoleController,
} from "./controller";
import {
  getAllOrdersController,
  updateOrderStatusController,
  deleteOrderController,
} from "../order/controller";

function createAdminRouter() {
  const router = Router();

  // Protect all admin endpoints with authentication and admin role check
  router.use(checkAuth, checkAdmin);

  // 1. Statistics & Dashboard Analytics
  router.get("/stats", getAdminStatsController);
  router.get("/dashboard", getAdminStatsController);

  // 2. User Management
  router.get("/users", getAdminUsersController);
  router.patch("/users/:userId/role", updateAdminUserRoleController);
  router.delete("/users/:userId", deleteAdminUserController);

  // 3. Inventory Management
  router.get("/inventory", getAdminInventoryController);
  router.patch("/inventory/:bookId/stock", quickUpdateStockController);

  // 4. Categories & Authors
  router.get("/categories", getAdminCategoriesController);
  router.get("/authors", getAdminAuthorsController);

  // 5. Reviews Moderation
  router.get("/reviews", getAdminReviewsController);
  router.patch("/reviews/:reviewId/moderate", moderateAdminReviewController);
  router.delete("/reviews/:reviewId", deleteAdminReviewController);

  // 6. Orders Management (Aliases)
  router.get("/orders", getAllOrdersController);
  router.patch("/orders/:orderId/status", updateOrderStatusController);
  router.delete("/orders/:orderId", deleteOrderController);

  return router;
}

export const adminRouter = createAdminRouter();
