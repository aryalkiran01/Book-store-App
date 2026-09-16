import { CouponModel } from "./model";
import { APIError } from "../../utils/error";
import { validateObjectId } from "../../utils/security";

export interface CreateCouponInput {
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  usageLimit?: number;
  startDate?: string | Date;
  endDate?: string | Date;
  isActive?: boolean;
}

export async function validateCouponService(code: string, subtotal: number) {
  if (!code || typeof code !== "string" || !code.trim()) {
    throw APIError.badRequest("Coupon code is required");
  }

  const cleanCode = code.trim().toUpperCase();
  const coupon = await CouponModel.findOne({ code: cleanCode, isActive: true });

  if (!coupon) {
    throw APIError.notFound(`Coupon "${cleanCode}" is invalid or inactive.`);
  }

  const now = new Date();
  if (coupon.startDate && coupon.startDate > now) {
    throw APIError.badRequest(`Coupon "${cleanCode}" is not yet active.`);
  }

  if (coupon.endDate && coupon.endDate < now) {
    throw APIError.badRequest(`Coupon "${cleanCode}" has expired.`);
  }

  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
    throw APIError.badRequest(`Coupon "${cleanCode}" usage limit has been reached.`);
  }

  const orderSubtotal = Math.max(0, Number(subtotal) || 0);
  if (coupon.minOrderAmount > 0 && orderSubtotal < coupon.minOrderAmount) {
    throw APIError.badRequest(
      `Coupon "${cleanCode}" requires a minimum order subtotal of NPR ${coupon.minOrderAmount}. Current subtotal is NPR ${orderSubtotal}.`
    );
  }

  let discount = 0;
  if (coupon.discountType === "percentage") {
    discount = (orderSubtotal * coupon.discountValue) / 100;
    if (coupon.maxDiscountAmount > 0 && discount > coupon.maxDiscountAmount) {
      discount = coupon.maxDiscountAmount;
    }
  } else {
    discount = Math.min(coupon.discountValue, orderSubtotal);
  }

  discount = Number(discount.toFixed(2));
  const newSubtotal = Math.max(0, Number((orderSubtotal - discount).toFixed(2)));

  return {
    code: coupon.code,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discountAmount: discount,
    originalSubtotal: orderSubtotal,
    discountedSubtotal: newSubtotal,
    isValid: true,
  };
}

export async function recordCouponUsageService(code: string) {
  const cleanCode = code.trim().toUpperCase();
  await CouponModel.findOneAndUpdate(
    { code: cleanCode },
    { $inc: { usedCount: 1 } }
  );
}

export async function createCouponService(input: CreateCouponInput) {
  if (!input.code || !input.discountValue || input.discountValue <= 0) {
    throw APIError.badRequest("Valid coupon code and discount value are required");
  }

  const cleanCode = input.code.trim().toUpperCase();
  const existing = await CouponModel.findOne({ code: cleanCode });
  if (existing) {
    throw APIError.conflict(`Coupon code "${cleanCode}" already exists.`);
  }

  const coupon = new CouponModel({
    code: cleanCode,
    description: input.description?.trim() || "",
    discountType: input.discountType || "percentage",
    discountValue: input.discountValue,
    minOrderAmount: input.minOrderAmount || 0,
    maxDiscountAmount: input.maxDiscountAmount || 0,
    usageLimit: input.usageLimit || 0,
    startDate: input.startDate ? new Date(input.startDate) : new Date(),
    endDate: input.endDate ? new Date(input.endDate) : undefined,
    isActive: input.isActive ?? true,
  });

  await coupon.save();
  return coupon;
}

export async function getAllCouponsService(query?: { isActive?: boolean; page?: number; limit?: number }) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (query?.isActive !== undefined) {
    filter.isActive = query.isActive;
  }

  const [total, coupons] = await Promise.all([
    CouponModel.countDocuments(filter),
    CouponModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
  ]);

  return {
    coupons,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function updateCouponService(id: string, input: Partial<CreateCouponInput>) {
  validateObjectId(id, "Coupon ID");
  const coupon = await CouponModel.findById(id);
  if (!coupon) throw APIError.notFound("Coupon not found");

  if (input.code) {
    const cleanCode = input.code.trim().toUpperCase();
    if (cleanCode !== coupon.code) {
      const existing = await CouponModel.findOne({ code: cleanCode, _id: { $ne: id } });
      if (existing) throw APIError.conflict(`Coupon code "${cleanCode}" already exists.`);
      coupon.code = cleanCode;
    }
  }

  if (input.description !== undefined) coupon.description = input.description;
  if (input.discountType !== undefined) coupon.discountType = input.discountType;
  if (input.discountValue !== undefined) coupon.discountValue = input.discountValue;
  if (input.minOrderAmount !== undefined) coupon.minOrderAmount = input.minOrderAmount;
  if (input.maxDiscountAmount !== undefined) coupon.maxDiscountAmount = input.maxDiscountAmount;
  if (input.usageLimit !== undefined) coupon.usageLimit = input.usageLimit;
  if (input.startDate !== undefined) coupon.startDate = new Date(input.startDate);
  if (input.endDate !== undefined) coupon.endDate = input.endDate ? new Date(input.endDate) : undefined as any;
  if (input.isActive !== undefined) coupon.isActive = input.isActive;

  await coupon.save();
  return coupon;
}

export async function deleteCouponService(id: string) {
  validateObjectId(id, "Coupon ID");
  const coupon = await CouponModel.findByIdAndDelete(id);
  if (!coupon) throw APIError.notFound("Coupon not found");
  return { message: "Coupon deleted successfully" };
}
