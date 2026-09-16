import { Request, Response, NextFunction } from "express";
import { APIError } from "../../utils/error";
import { CreateOrderSchema, UpdateOrderStatusSchema, ValidateCartSchema } from "./validation";
import {
  cancelOrderService,
  createOrderService,
  createRefundRequestService,
  deleteOrderService,
  getAllOrdersService,
  getOrderByIdService,
  getOrdersByUserIdService,
  updateOrderShippingService,
  updateOrderStatusService,
  validateCartService,
} from "./service";

export async function validateCartController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { success, error, data } = ValidateCartSchema.safeParse(req.body);
    if (!success) {
      res.status(400).json({
        message: "Invalid cart items format",
        isSuccess: false,
        data: null,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const cartResult = await validateCartService(data.items);
    res.status(200).json({
      message: "Cart validated successfully",
      isSuccess: true,
      data: cartResult,
    });
  } catch (error) {
    next(error);
  }
}

export async function createOrderController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const effectiveUserId =
      req.user?.role === "admin" && req.body.userId
        ? req.body.userId
        : req.user?.id;

    if (!effectiveUserId) {
      res.status(401).json({
        message: "Authentication required to place an order",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const body = {
      ...req.body,
      books: req.body.books || req.body.items,
      userId: effectiveUserId,
    };

    const { success, error, data } = CreateOrderSchema.safeParse(body);

    if (!success) {
      res.status(400).json({
        message: "Invalid order data",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const order = await createOrderService(data);
    res.status(201).json({
      message: "Order placed successfully",
      isSuccess: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function getAllOrdersController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const result = await getAllOrdersService({ page, limit });
    res.status(200).json({
      message: "All orders retrieved successfully",
      isSuccess: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyOrdersController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user.id;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const status = req.query.status ? String(req.query.status) : undefined;

    const result = await getOrdersByUserIdService(userId, {
      page,
      limit,
      status,
    });
    res.status(200).json({
      message: "My orders retrieved successfully",
      isSuccess: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrdersByUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const requestedUserId = req.params.userId;

    if (
      req.user.role !== "admin" &&
      req.user.id !== requestedUserId
    ) {
      res.status(403).json({
        message: "Forbidden: Cannot view orders for another user",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const status = req.query.status ? String(req.query.status) : undefined;

    const result = await getOrdersByUserIdService(requestedUserId, {
      page,
      limit,
      status,
    });
    res.status(200).json({
      message: "Orders retrieved successfully",
      isSuccess: true,
      data: result.orders,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

export async function getOrderByIdController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.params.orderId;
    const order = await getOrderByIdService(
      orderId,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      message: "Order retrieved successfully",
      isSuccess: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function cancelOrderController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.params.orderId;
    const reason = req.body?.reason ? String(req.body.reason) : undefined;

    const order = await cancelOrderService(
      orderId,
      req.user.id,
      req.user.role,
      reason
    );

    res.status(200).json({
      message: "Order cancelled successfully",
      isSuccess: true,
      data: order,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderStatusController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.params.orderId;
    const body = req.body;
    const { success, error, data } = UpdateOrderStatusSchema.safeParse(body);

    if (!success) {
      res.status(400).json({
        message: "Invalid request",
        isSuccess: false,
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const updatedOrder = await updateOrderStatusService(
      orderId,
      data,
      req.user?.username || "admin"
    );
    res.status(200).json({
      message: "Order status updated successfully",
      isSuccess: true,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteOrderController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.params.orderId;
    await deleteOrderService(orderId, req.user?.id);
    res.status(200).json({
      message: "Order deleted successfully",
      isSuccess: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOrderShippingController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.params.orderId;
    const shippingData = req.body;

    const updatedOrder = await updateOrderShippingService(
      orderId,
      shippingData,
      req.user?.username || "admin"
    );

    res.status(200).json({
      message: "Order shipping details updated successfully",
      isSuccess: true,
      data: updatedOrder,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestRefundController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const orderId = req.params.orderId;
    const { reason, amount } = req.body;

    if (!reason || typeof reason !== "string" || !reason.trim()) {
      res.status(400).json({
        message: "A valid reason is required to request a refund",
        isSuccess: false,
        data: null,
      });
      return;
    }

    const refund = await createRefundRequestService(
      orderId,
      req.user.id,
      reason.trim(),
      amount ? Number(amount) : undefined
    );

    res.status(201).json({
      message: "Refund request submitted successfully",
      isSuccess: true,
      data: refund,
    });
  } catch (error) {
    next(error);
  }
}


