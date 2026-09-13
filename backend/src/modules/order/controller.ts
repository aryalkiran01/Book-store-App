import { Request, Response, NextFunction } from "express";
import { APIError } from "../../utils/error";
import { CreateOrderSchema, UpdateOrderStatusSchema } from "./validation";
import {
  createOrderService,
  deleteOrderService,
  getAllOrdersService,
  getOrderByIdService,
  getOrdersByUserIdService,
  updateOrderStatusService,
} from "./service";

export async function createOrderController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const body = {
      ...req.body,
      userId: req.user?.id || req.body.userId,
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

    const result = await getOrdersByUserIdService(requestedUserId, { page, limit });
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
    const order = await getOrderByIdService(orderId);

    const orderOwnerId =
      (order.userId as any)?._id?.toString() || order.userId?.toString();

    if (
      req.user.role !== "admin" &&
      req.user.id !== orderOwnerId
    ) {
      res.status(403).json({
        message: "Forbidden: Cannot view this order",
        isSuccess: false,
        data: null,
      });
      return;
    }

    res.status(200).json({
      message: "Order retrieved successfully",
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

    const updatedOrder = await updateOrderStatusService(orderId, data);
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
    await deleteOrderService(orderId);
    res.status(200).json({
      message: "Order deleted successfully",
      isSuccess: true,
      data: null,
    });
  } catch (error) {
    next(error);
  }
}

