import express from "express";
import {
  initiatePaymentController,
  verifyPaymentController,
} from "./controller";
import { checkAuth } from "../auth/middleware";

const router = express.Router();

router.post("/initiate", checkAuth, initiatePaymentController);
router.post("/verify", checkAuth, verifyPaymentController);

export default router;

