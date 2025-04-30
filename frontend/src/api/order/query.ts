import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchOrdersByUser,
  fetchOrderById,
  createOrder,
  cancelOrder,
} from "./fetch";

// Fetch all orders for a user
export function useOrders(userId: string) {
  return useQuery({
    queryKey: ["orders", userId],
    queryFn: () => fetchOrdersByUser(userId),
  });
}

//  Fetch a single order by ID
export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: () => fetchOrderById(orderId),
  });
}

//  Create an order (Mutation)
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

//  Cancel an order (Mutation)
export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
