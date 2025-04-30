import { Request, Response, NextFunction } from "express";
import { APIError } from "src/utils/error";
import { CreateOrderSchema, UpdateOrderStatusSchema } from "./validation";
import {
  createOrderService,
  deleteOrderService,
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
    console.log("Received request body:", req.body); // Log incoming data
    const { success, error, data } = CreateOrderSchema.safeParse(req.body);

    if (!success) {
      console.log("Validation error:", error.flatten().fieldErrors);
      res.status(400).json({
        message: "Invalid request",
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const order = await createOrderService(data);
    res.status(201).json({ message: "Order placed successfully", data: order });
  } catch (error) {
    next(new APIError(500, (error as Error).message));
  }
}

export async function getOrdersByUserController(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.params.userId;
    const orders = await getOrdersByUserIdService(userId);
    res
      .status(200)
      .json({ message: "Orders retrieved successfully", data: orders });
  } catch (error) {
    next(
      error instanceof APIError
        ? error
        : new APIError(500, (error as Error).message)
    );
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
    res
      .status(200)
      .json({ message: "Order retrieved successfully", data: order });
  } catch (error) {
    next(
      error instanceof APIError
        ? error
        : new APIError(500, (error as Error).message)
    );
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
        errors: error.flatten().fieldErrors,
      });
      return;
    }

    const updatedOrder = await updateOrderStatusService(orderId, data);
    res.status(200).json({
      message: "Order status updated successfully",
      data: updatedOrder,
    });
  } catch (error) {
    next(
      error instanceof APIError
        ? error
        : new APIError(500, (error as Error).message)
    );
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
    res.status(200).json({ message: "Order deleted successfully" });
  } catch (error) {
    next(
      error instanceof APIError
        ? error
        : new APIError(500, (error as Error).message)
    );
  }
}
