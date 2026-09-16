import { Router, Request, Response, NextFunction } from "express";
import { checkAuth, checkAdmin } from "../auth/middleware";
import {
  createSupportTicketService,
  getAllSupportTicketsService,
  updateSupportTicketStatusService,
} from "./service";
import { CreateSupportTicketSchema, UpdateSupportTicketStatusSchema } from "./validation";

export const supportRouter = Router();

// Public / Authenticated ticket submission
supportRouter.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CreateSupportTicketSchema.parse(req.body);
      const userId = (req as any).user?.id || (req as any).user?.userId;
      const ticket = await createSupportTicketService(validated, userId);

      res.status(201).json({
        isSuccess: true,
        message: "Your support request has been submitted successfully. Our team will contact you shortly.",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: List all support tickets
supportRouter.get(
  "/admin",
  checkAuth,
  checkAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { page, limit, status } = req.query;
      const result = await getAllSupportTicketsService({
        page: Number(page) || 1,
        limit: Number(limit) || 20,
        status: status ? String(status) : undefined,
      });

      res.status(200).json({
        isSuccess: true,
        message: "Support tickets retrieved successfully",
        data: result.tickets,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Admin: Update ticket status
supportRouter.patch(
  "/admin/:id/status",
  checkAuth,
  checkAdmin,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = UpdateSupportTicketStatusSchema.parse(req.body);
      const ticket = await updateSupportTicketStatusService(req.params.id, validated);

      res.status(200).json({
        isSuccess: true,
        message: "Support ticket status updated successfully",
        data: ticket,
      });
    } catch (error) {
      next(error);
    }
  }
);
