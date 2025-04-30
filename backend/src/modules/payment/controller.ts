import { Request, Response, NextFunction } from "express";
import { initiatePaymentService, verifyPaymentService } from "./service";
import { InitiatePaymentSchema, VerifyPaymentSchema } from "./validation";
import { APIError } from "src/utils/error";

export async function initiatePaymentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("Received request body:", req.body);

    const result = InitiatePaymentSchema.safeParse(req.body);

    if (!result.success) {
      console.log("Validation error:", result.error.flatten().fieldErrors);
      return res.status(400).json({
        message: "Invalid request",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const paymentResponse = await initiatePaymentService(result.data);
    res.status(201).json({
      message: "Payment initiated successfully",
      data: paymentResponse,
    });
  } catch (error) {
    next(new APIError(500, (error as Error).message));
  }
}

export async function verifyPaymentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    console.log("Received request body:", req.body);
    const result = VerifyPaymentSchema.safeParse(req.body);

    if (!result.success) {
      console.log("Validation error:", result.error.flatten().fieldErrors);
      return res.status(400).json({
        message: "Invalid request",
        errors: result.error.flatten().fieldErrors,
      });
    }

    const verificationResponse = await verifyPaymentService(result.data.pidx);
    res.status(200).json({
      message: "Payment verified successfully",
      data: verificationResponse,
    });
  } catch (error) {
    next(new APIError(500, (error as Error).message));
  }
}
