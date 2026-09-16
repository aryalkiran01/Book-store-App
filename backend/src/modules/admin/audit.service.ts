import { AdminAuditLogModel } from "./audit.model";

export interface LogAuditParams {
  adminId: string;
  adminUsername?: string;
  action: string;
  targetType: string;
  targetId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export async function recordAdminAuditLog(params: LogAuditParams) {
  try {
    const log = new AdminAuditLogModel({
      adminId: params.adminId,
      adminUsername: params.adminUsername || "admin",
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId || "",
      details: params.details || {},
      ipAddress: params.ipAddress || "",
      userAgent: params.userAgent || "",
    });
    await log.save();
    return log;
  } catch (err: any) {
    console.error("Failed to write admin audit log:", err.message);
  }
}

export async function getAdminAuditLogsService(query?: {
  adminId?: string;
  action?: string;
  targetType?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(query?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query?.limit) || 20));
  const skip = (page - 1) * limit;

  const filter: any = {};
  if (query?.adminId) filter.adminId = query.adminId;
  if (query?.action) filter.action = query.action;
  if (query?.targetType) filter.targetType = query.targetType;

  const [total, logs] = await Promise.all([
    AdminAuditLogModel.countDocuments(filter),
    AdminAuditLogModel.find(filter)
      .populate("adminId", "username email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return {
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
}
