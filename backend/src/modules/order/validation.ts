import { z } from "zod";

export const CreateOrderSchema = z.object({
  userId: z.string().min(1),
  books: z.array(
    z.object({
      bookId: z.string().min(1),
      quantity: z.number().min(1),
    })
  ),
  totalAmount: z.number().min(0),
});

export const UpdateOrderStatusSchema = z.object({
  status: z.enum(["pending", "shipped", "delivered", "cancelled"]),
});

export type TCreateOrderInput = z.TypeOf<typeof CreateOrderSchema>;
export type TUpdateOrderStatusInput = z.TypeOf<typeof UpdateOrderStatusSchema>;
