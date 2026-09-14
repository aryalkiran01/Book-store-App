import { Request, Response, NextFunction } from "express";
import {
  initiateKhaltiPaymentService,
  verifyKhaltiPaymentService,
  initiateEsewaPaymentService,
  verifyEsewaPaymentService,
} from "./service";
import {
  InitiatePaymentSchema,
  VerifyPaymentSchema,
  InitiateEsewaSchema,
  VerifyEsewaSchema,
} from "./validation";

/**
 * -------------------------------------------------------------
 * Khalti Controllers
 * -------------------------------------------------------------
 */

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

    const paymentResponse = await initiateKhaltiPaymentService(
      result.data,
      requestingUserId,
      requestingUserRole
    );

    res.status(201).json({
      message: "Khalti payment initiated successfully",
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

    const verificationResponse = await verifyKhaltiPaymentService(
      result.data.pidx,
      result.data.orderId,
      requestingUserId,
      requestingUserRole
    );

    res.status(200).json({
      message: "Khalti payment verified successfully",
      isSuccess: true,
      data: verificationResponse,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * -------------------------------------------------------------
 * eSewa Controllers
 * -------------------------------------------------------------
 */

export async function initiateEsewaController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = InitiateEsewaSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request",
        isSuccess: false,
        errors: result.error.flatten().fieldErrors,
      });
    }

    const requestingUserId = req.user?.id;
    const requestingUserRole = req.user?.role;

    const esewaResponse = await initiateEsewaPaymentService(
      result.data.orderId,
      requestingUserId,
      requestingUserRole
    );

    res.status(201).json({
      message: "eSewa payment initiated successfully",
      isSuccess: true,
      data: esewaResponse,
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyEsewaController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const result = VerifyEsewaSchema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        message: "Invalid request",
        isSuccess: false,
        errors: result.error.flatten().fieldErrors,
      });
    }

    const requestingUserId = req.user?.id;
    const requestingUserRole = req.user?.role;

    const verificationResponse = await verifyEsewaPaymentService(
      result.data.data,
      requestingUserId,
      requestingUserRole
    );

    res.status(200).json({
      message: "eSewa payment verified successfully",
      isSuccess: true,
      data: verificationResponse,
    });
  } catch (error) {
    next(error);
  }
}
