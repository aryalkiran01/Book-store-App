import { SupportTicketModel } from "./model";
import { TCreateSupportTicketInput, TUpdateSupportTicketStatusInput } from "./validation";
import { APIError } from "../../utils/error";
import { validateObjectId } from "../../utils/security";

export async function createSupportTicketService(
  input: TCreateSupportTicketInput,
  userId?: string
) {
  const ticket = new SupportTicketModel({
    userId: userId || undefined,
    name: input.name,
    email: input.email.toLowerCase(),
    subject: input.subject,
    message: input.message,
    priority: input.priority || "medium",
    status: "open",
  });

  await ticket.save();
  return ticket;
}

export async function getAllSupportTicketsService(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const page = Math.max(1, Number(params?.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(params?.limit) || 20));
  const skip = (page - 1) * limit;

  const query: any = {};
  if (params?.status && params.status !== "all") {
    query.status = params.status;
  }

  const [total, tickets] = await Promise.all([
    SupportTicketModel.countDocuments(query),
    SupportTicketModel.find(query)
      .populate("userId", "username email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    tickets,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}

export async function updateSupportTicketStatusService(
  ticketId: string,
  input: TUpdateSupportTicketStatusInput
) {
  validateObjectId(ticketId, "Ticket ID");

  const ticket = await SupportTicketModel.findById(ticketId);
  if (!ticket) {
    throw APIError.notFound("Support ticket not found");
  }

  ticket.status = input.status;
  if (input.adminNotes !== undefined) {
    ticket.adminNotes = input.adminNotes;
  }

  await ticket.save();
  return ticket;
}
