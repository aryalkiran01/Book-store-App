import { z } from "zod";

const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/;

export const CreateOrderSchema = z
  .object({
    userId: z.string().min(1, "User ID is required"),
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name cannot exceed 100 characters")
      .optional(),
    email: z
      .string()
      .trim()
      .email("Please provide a valid contact email address")
      .max(100)
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Please provide a valid contact phone number")
      .optional(),
    customerInfo: z
      .object({
        fullName: z
          .string()
          .trim()
          .min(2, "Full name must be at least 2 characters")
          .max(100, "Full name cannot exceed 100 characters")
          .optional(),
        email: z
          .string()
          .trim()
          .email("Please provide a valid contact email address")
          .max(100)
          .optional(),
        phone: z
          .string()
          .trim()
          .regex(phoneRegex, "Please provide a valid contact phone number")
          .optional(),
      })
      .optional(),
    books: z
      .array(
        z.object({
          bookId: z.string().min(1, "Book ID is required"),
          quantity: z.number().int().min(1, "Quantity must be at least 1"),
        })
      )
      .optional(),
    items: z
      .array(
        z.object({
          bookId: z.string().min(1, "Book ID is required"),
          quantity: z.number().int().min(1, "Quantity must be at least 1"),
        })
      )
      .optional(),
    subtotal: z.number().min(0).optional(),
    shippingCost: z.number().min(0).optional(),
    discount: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(), // Calculated authoritatively by backend
    shippingAddress: z
      .union([
        z.string(),
        z.object({
          fullName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          phoneNumber: z.string().optional(),
          street: z.string().optional(),
          address: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          postalCode: z.string().optional(),
          country: z.string().optional(),
        }),
      ])
      .optional(),
    orderNote: z.string().max(500).optional(),
    couponCode: z.string().optional(),
    paymentMethod: z
      .enum(["khalti", "esewa", "cod", "card", "demo", "cash_on_delivery"])
      .default("cod"),
    paymentId: z.string().optional(),
  })
  .refine(
    (data) =>
      (data.books && data.books.length > 0) ||
      (data.items && data.items.length > 0),
    {
      message: "At least one book item is required to place an order",
      path: ["books"],
    }
  );

export const ValidateCartSchema = z.object({
  items: z.array(
    z.object({
      bookId: z.string().min(1, "Book ID is required"),
      quantity: z.number().int().min(1, "Quantity must be at least 1"),
    })
  ),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum([
    "pending",
    "confirmed",
    "processing",
    "shipped",
    "delivered",
    "cancelled",
    "refunded",
  ]),
  paymentStatus: z
    .enum(["pending", "completed", "failed", "refunded"])
    .optional(),
  note: z.string().max(500).optional(),
});

export const CancelOrderSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const OrderQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(50).default(20),
  status: z
    .enum([
      "all",
      "pending",
      "confirmed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "refunded",
    ])
    .optional(),
});

export type TCreateOrderInput = z.TypeOf<typeof CreateOrderSchema>;
export type TValidateCartInput = z.TypeOf<typeof ValidateCartSchema>;
export type TUpdateOrderStatusInput = z.TypeOf<typeof UpdateOrderStatusSchema>;
export type TCancelOrderInput = z.TypeOf<typeof CancelOrderSchema>;
export type TOrderQueryInput = z.TypeOf<typeof OrderQuerySchema>;

