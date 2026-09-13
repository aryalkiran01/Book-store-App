import { z } from "zod";

export const AdminQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(["all", "admin", "user"]).optional(),
  status: z.string().optional(),
  genre: z.string().optional(),
  stockFilter: z.enum(["all", "out_of_stock", "low_stock", "in_stock"]).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type TAdminQueryInput = z.infer<typeof AdminQuerySchema>;

export const UpdateUserRoleSchema = z.object({
  role: z.enum(["admin", "user"], {
    errorMap: () => ({ message: "Role must be either 'admin' or 'user'" }),
  }),
});

export type TUpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;

export const UpdateStockSchema = z.object({
  stock: z.number().int().min(0, "Stock must be a non-negative integer"),
});

export type TUpdateStockInput = z.infer<typeof UpdateStockSchema>;

export const ModerateReviewSchema = z.object({
  status: z.enum(["published", "flagged", "hidden"], {
    errorMap: () => ({
      message: "Status must be 'published', 'flagged', or 'hidden'",
    }),
  }),
  moderationNote: z.string().max(500).optional(),
});

export type TModerateReviewInput = z.infer<typeof ModerateReviewSchema>;
