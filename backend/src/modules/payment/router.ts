import express from "express";
import {
  initiatePaymentController,
  verifyPaymentController,
} from "./controller";

const router = express.Router();

// router.post("/initiate", initiatePaymentController);
// router.post("/verify", verifyPaymentController);

export default router;
