import { Request, Response, NextFunction } from "express";
import { initiatePaymentService, verifyPaymentService } from "./service";
import { InitiatePaymentSchema, VerifyPaymentSchema } from "./validation";
import { APIError } from "../../utils/error";

export async function initiatePaymentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = InitiatePaymentSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request",
        isSuccess: false,
        errors: result.error.flatten().fieldErrors,
      });
    }

    const requestingUserId = req.user?.id;
    const requestingUserRole = req.user?.role;

    const paymentResponse = await initiatePaymentService(
      result.data,
      requestingUserId,
      requestingUserRole
    );

    res.status(201).json({
      message: "Payment initiated successfully",
      isSuccess: true,
      data: paymentResponse,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyPaymentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = VerifyPaymentSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request",
        isSuccess: false,
        errors: result.error.flatten().fieldErrors,
      });
    }

    const requestingUserId = req.user?.id;
    const requestingUserRole = req.user?.role;

    const verificationResponse = await verifyPaymentService(
      result.data.pidx,
      result.data.orderId,
      requestingUserId,
      requestingUserRole
    );

    res.status(200).json({
      message: "Payment verified successfully",
      isSuccess: true,
      data: verificationResponse,
    });
  } catch (error) {
    next(error);
  }
}
