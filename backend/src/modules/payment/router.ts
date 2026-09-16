import express from "express";
import {
  initiatePaymentController,
  verifyPaymentController,
  initiateEsewaController,
  verifyEsewaController,
  processDemoPaymentController,
  getRefundsController,
  processRefundController,
} from "./controller";
import { checkAdmin, checkAuth } from "../auth/middleware";

const router = express.Router();

// Khalti Payment Endpoints
router.post("/initiate", checkAuth, initiatePaymentController);
router.post("/verify", checkAuth, verifyPaymentController);

// eSewa Payment Endpoints
router.post("/esewa/initiate", checkAuth, initiateEsewaController);
router.post("/esewa/verify", checkAuth, verifyEsewaController);

// Demo / Simulated Payment Endpoints (Development & Testing only)
router.post("/demo", checkAuth, processDemoPaymentController);
router.post("/simulate", checkAuth, processDemoPaymentController);

// Refund Administration Endpoints
router.get("/refunds", checkAuth, checkAdmin, getRefundsController);
router.post("/refunds/:refundId/process", checkAuth, checkAdmin, processRefundController);

export default router;

