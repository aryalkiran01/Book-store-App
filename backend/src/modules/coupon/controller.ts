import { Request, Response, NextFunction } from "express";
import {
  createCouponService,
  deleteCouponService,
  getAllCouponsService,
  updateCouponService,
  validateCouponService,
} from "./service";

export async function validateCouponController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { code, subtotal } = req.body;
    const result = await validateCouponService(code, Number(subtotal) || 0);
    res.status(200).json({
      message: "Coupon is valid",
      isSuccess: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllCouponsController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const isActive = req.query.isActive !== undefined ? req.query.isActive === "true" : undefined;

    const result = await getAllCouponsService({ page, limit, isActive });
    res.status(200).json({
      message: "Coupons retrieved successfully",
      isSuccess: true,
      data: result.coupons,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function createCouponController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const coupon = await createCouponService(req.body);
    res.status(201).json({
      message: "Coupon created successfully",
      isSuccess: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCouponController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id;
    const coupon = await updateCouponService(id, req.body);
    res.status(200).json({
      message: "Coupon updated successfully",
      isSuccess: true,
      data: coupon,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteCouponController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const id = req.params.id;
    const result = await deleteCouponService(id);
    res.status(200).json({
      message: result.message,
      isSuccess: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}
