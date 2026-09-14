import express from "express";
import {
  initiatePaymentController,
  verifyPaymentController,
  initiateEsewaController,
  verifyEsewaController,
} from "./controller";
import { checkAuth } from "../auth/middleware";

const router = express.Router();

// Khalti Payment Endpoints
router.post("/initiate", checkAuth, initiatePaymentController);
router.post("/verify", checkAuth, verifyPaymentController);

// eSewa Payment Endpoints
router.post("/esewa/initiate", checkAuth, initiateEsewaController);
router.post("/esewa/verify", checkAuth, verifyEsewaController);

export default router;
