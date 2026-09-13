import { OrderModel } from "./model";
import { APIError } from "../../utils/error";
import { TCreateOrderInput, TUpdateOrderStatusInput } from "./validation";
import { validateObjectId } from "../../utils/security";

export async function createOrderService(input: TCreateOrderInput) {
  validateObjectId(input.userId, "User ID");
  for (const item of input.books) {
    validateObjectId(item.bookId, "Book ID");
  }

  const newOrder = new OrderModel(input);
  await newOrder.save();
  return { orderId: newOrder._id, ...newOrder.toObject() };
}

export async function getAllOrdersService() {
  const orders = await OrderModel.find()
    .populate("userId", "username email")
    .populate("books.bookId")
    .sort({ createdAt: -1 });
  return orders;
}

export async function getOrdersByUserIdService(userId: string) {
  validateObjectId(userId, "User ID");
  const orders = await OrderModel.find({ userId })
    .populate("books.bookId")
    .sort({ createdAt: -1 });
  return orders;
}

export async function getOrderByIdService(orderId: string) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findById(orderId)
    .populate("userId", "username email")
    .populate("books.bookId");
  if (!order) throw APIError.notFound("Order not found");
  return order;
}

export async function updateOrderStatusService(
  orderId: string,
  input: TUpdateOrderStatusInput
) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findById(orderId);
  if (!order) throw APIError.notFound("Order not found");

  order.status = input.status;
  await order.save();
  return order;
}

export async function deleteOrderService(orderId: string) {
  validateObjectId(orderId, "Order ID");
  const order = await OrderModel.findByIdAndDelete(orderId);
  if (!order) throw APIError.notFound("Order not found");
  return order;
}

