import { OrderModel } from "./model";
import { releaseOrderReservation } from "../inventory/service";

let cleanupIntervalTimer: NodeJS.Timeout | null = null;

export async function processExpiredReservations() {
  try {
    const now = new Date();
    // Find all expired pending online orders
    const expiredOrders = await OrderModel.find({
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: { $in: ["khalti", "esewa", "card", "demo"] },
      reservationExpiresAt: { $lt: now },
      isDeleted: { $ne: true },
    }).limit(20);

    for (const order of expiredOrders) {
      order.status = "cancelled";
      order.cancellationReason = "Order reservation expired (unpaid online checkout timeout)";
      order.cancelledAt = now;
      order.statusHistory.push({
        status: "cancelled",
        changedAt: now,
        note: "System cancelled order due to expired payment reservation window (15 minutes).",
        changedBy: "reservation_worker",
      });

      await order.save();

      // Release reserved stock back to available pool
      const itemsToRelease = order.books.map((b) => ({
        bookId: b.bookId.toString(),
        quantity: b.quantity,
      }));

      await releaseOrderReservation(
        itemsToRelease,
        order._id.toString(),
        "Automatic release: Reservation expired"
      );
    }

    return expiredOrders.length;
  } catch (error) {
    console.error("Error processing expired order reservations:", error);
    return 0;
  }
}

export function startReservationCleanupWorker(intervalMs = 60000) {
  if (cleanupIntervalTimer) return;
  // Run initial check
  processExpiredReservations().catch(() => {});
  // Schedule recurring checks
  cleanupIntervalTimer = setInterval(() => {
    processExpiredReservations().catch(() => {});
  }, intervalMs);
}

export function stopReservationCleanupWorker() {
  if (cleanupIntervalTimer) {
    clearInterval(cleanupIntervalTimer);
    cleanupIntervalTimer = null;
  }
}
