import { z } from "zod";

export const InitiatePaymentSchema = z.object({
  return_url: z.string().url("Invalid return URL"),
  website_url: z.string().url("Invalid website URL"),
  amount: z.number().min(100, "Amount must be at least 1 Rupee (100 paisa)"),
  purchase_order_id: z.string().min(1, "Purchase order ID is required"),
  purchase_order_name: z.string().min(1, "Purchase order name is required"),
  customer_info: z
    .object({
      name: z.string().optional(),
      email: z.string().email("Invalid email format").optional(),
      phone: z.string().min(10, "Invalid phone number").optional(),
    })
    .optional(),
});

export const VerifyPaymentSchema = z.object({
  pidx: z.string().min(1, "Payment ID (pidx) is required"),
});
