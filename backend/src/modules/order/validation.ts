import { z } from "zod";

export const CreateOrderSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  books: z
    .array(
      z.object({
        bookId: z.string().min(1, "Book ID is required"),
        quantity: z.number().int().min(1, "Quantity must be at least 1"),
      })
    )
    .min(1, "At least one book item is required to place an order"),
  totalAmount: z.number().min(0).optional(), // Calculated authoritatively by backend
  shippingAddress: z
    .object({
      fullName: z.string().optional(),
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  paymentMethod: z.enum(["khalti", "cod", "card", "demo"]).default("khalti"),
  paymentId: z.string().optional(),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled"]),
  paymentStatus: z
    .enum(["pending", "completed", "failed", "refunded"])
    .optional(),
});

export type TCreateOrderInput = z.TypeOf<typeof CreateOrderSchema>;
export type TUpdateOrderStatusInput = z.TypeOf<typeof UpdateOrderStatusSchema>;
