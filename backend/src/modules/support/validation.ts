import { z } from "zod";

export const CreateSupportTicketSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Valid email address is required").max(150),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(3000),
  priority: z.enum(["low", "medium", "high"]).optional().default("medium"),
});

export const UpdateSupportTicketStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  adminNotes: z.string().trim().max(1000).optional(),
});

export type TCreateSupportTicketInput = z.infer<typeof CreateSupportTicketSchema>;
export type TUpdateSupportTicketStatusInput = z.infer<typeof UpdateSupportTicketStatusSchema>;
