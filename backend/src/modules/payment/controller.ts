import { Request, Response, NextFunction } from "express";
import {
  initiateKhaltiPaymentService,
  verifyKhaltiPaymentService,
  initiateEsewaPaymentService,
  verifyEsewaPaymentService,
  processDemoPaymentService,
  getRefundsService,
  processRefundService,
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
    const simulateProduction = req.headers["x-test-simulate-production"] === "true";

    const verificationResponse = await verifyKhaltiPaymentService(
      result.data.pidx,
      result.data.orderId,
      requestingUserId,
      requestingUserRole,
      simulateProduction
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

/**
 * -------------------------------------------------------------
 * Demo & Refund Controllers
 * -------------------------------------------------------------
 */

export async function processDemoPaymentController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.body?.orderId || req.params?.orderId;
    if (!orderId) {
      res.status(400).json({
        message: "orderId is required",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const requestingUserId = req.user?.id;
    const requestingUserRole = req.user?.role;

    const result = await processDemoPaymentService(
      orderId,
      requestingUserId,
      requestingUserRole
    );

    res.status(200).json({
      message: "Demo payment completed successfully",
      isSuccess: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getRefundsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const status = req.query.status ? String(req.query.status) : undefined;

    const result = await getRefundsService({ page, limit, status });

    res.status(200).json({
      message: "Refunds retrieved successfully",
      isSuccess: true,
      data: result.refunds,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function processRefundController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const refundId = req.params.refundId || req.body.refundId;
    const action = req.body.action as "approve" | "reject";
    const note = req.body.note || req.body.reason;
    const restockItems = req.body.restockItems !== false;

    if (!action || !["approve", "reject"].includes(action)) {
      res.status(400).json({
        message: "action must be either 'approve' or 'reject'",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const result = await processRefundService(
      refundId,
      action,
      req.user?.id || "admin",
      note,
      restockItems
    );

    res.status(200).json({
      message: result.message,
      isSuccess: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}
