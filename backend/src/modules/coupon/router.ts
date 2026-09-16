import { Router } from "express";
import {
  createCouponController,
  deleteCouponController,
  getAllCouponsController,
  updateCouponController,
  validateCouponController,
} from "./controller";
import { checkAdmin, checkAuth } from "../auth/middleware";

function createCouponRouter() {
  const router = Router();

  // Public/User coupon validation
  router.post("/validate", checkAuth, validateCouponController);

  // Admin routes
  router.get("/", checkAuth, checkAdmin, getAllCouponsController);
  router.post("/", checkAuth, checkAdmin, createCouponController);
  router.put("/:id", checkAuth, checkAdmin, updateCouponController);
  router.patch("/:id", checkAuth, checkAdmin, updateCouponController);
  router.delete("/:id", checkAuth, checkAdmin, deleteCouponController);

  return router;
}

export const couponRouter = createCouponRouter();
