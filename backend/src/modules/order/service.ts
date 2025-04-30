import { OrderModel } from "./model";
import { APIError } from "src/utils/error";
import { TCreateOrderInput, TUpdateOrderStatusInput } from "./validation";

export async function createOrderService(input: TCreateOrderInput) {
  const newOrder = new OrderModel(input);
  await newOrder.save();
  return { orderId: newOrder._id, ...newOrder.toObject() };
}

export async function getOrdersByUserIdService(userId: string) {
  const orders = await OrderModel.find({ userId }).populate("books.bookId");
  return orders;
}

export async function getOrderByIdService(orderId: string) {
  const order = await OrderModel.findById(orderId).populate("books.bookId");
  if (!order) throw APIError.notFound("Order not found");
  return order;
}

export async function updateOrderStatusService(
  orderId: string,
  input: TUpdateOrderStatusInput
) {
  const order = await OrderModel.findById(orderId);
  if (!order) throw APIError.notFound("Order not found");

  order.status = input.status;
  await order.save();
  return order;
}

export async function deleteOrderService(orderId: string) {
  const order = await OrderModel.findByIdAndDelete(orderId);
  if (!order) throw APIError.notFound("Order not found");
  return order;
}
