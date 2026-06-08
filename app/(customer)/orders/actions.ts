"use server";

import { revalidatePath } from "next/cache";
import { type SubOrderStatus, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

// ── SubOrder progression map ──────────────────────────────────────────────────
// Only PENDING, ACCEPTED, PACKED, PICKED_UP have a next state.
// DELIVERED, CANCELLED, REJECTED are terminal — excluded from transitions.
const subOrderNext: Record<string, string> = {
  PENDING: "ACCEPTED",
  ACCEPTED: "PACKED",
  PACKED: "PICKED_UP",
  PICKED_UP: "DELIVERED",
};

// ── Tick one step forward for all advanceable sub-orders on an order ──────────
export async function tickOrderProgress(
  orderId: string
): Promise<
  | { ok: true; advanced: number; allDelivered: boolean }
  | { ok: false; code: string }
> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch order with sub-orders
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { subOrders: true },
      });

      if (!order) throw new Error("ORDER_NOT_FOUND");

      // 2. Which sub-orders can advance?
      const advanceable = order.subOrders.filter(
        (so) => subOrderNext[so.status] !== undefined
      );

      // 3. Nothing to advance
      if (advanceable.length === 0) {
        const allDeliveredNow = order.subOrders.every(
          (so) => so.status === "DELIVERED"
        );

        // Sync parent order if all sub-orders are DELIVERED but order isn't yet
        if (allDeliveredNow && order.status !== "DELIVERED") {
          await tx.order.update({
            where: { id: order.id },
            data: { status: "DELIVERED" as OrderStatus },
          });
          await tx.orderEvent.create({
            data: {
              orderId: order.id,
              type: "ORDER_DELIVERED",
              payload: { orderId: order.id },
            },
          });
        }

        return {
          advanced: 0,
          allDelivered:
            order.status === "DELIVERED" || allDeliveredNow,
        };
      }

      // 4. Advance each sub-order one step and write an audit event
      for (const so of advanceable) {
        const from = so.status;
        const to = subOrderNext[from]!;

        await tx.subOrder.update({
          where: { id: so.id },
          data: { status: to as SubOrderStatus },
        });

        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "SUBORDER_STATE_CHANGED",
            payload: { subOrderId: so.id, from, to },
          },
        });
      }

      // 5. Re-check: are ALL sub-orders now DELIVERED?
      //    Compute expected post-update statuses without another DB round-trip.
      const newStatuses = order.subOrders.map((so) => {
        const next = subOrderNext[so.status];
        return next !== undefined ? next : so.status;
      });
      const allDeliveredAfter = newStatuses.every((s) => s === "DELIVERED");

      if (allDeliveredAfter && order.status !== "DELIVERED") {
        await tx.order.update({
          where: { id: order.id },
          data: { status: "DELIVERED" as OrderStatus },
        });
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "ORDER_DELIVERED",
            payload: { orderId: order.id },
          },
        });
      }

      return {
        advanced: advanceable.length,
        allDelivered: allDeliveredAfter,
      };
    });

    // 6. Revalidate all affected paths
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/orders");
    revalidatePath("/merchant");
    revalidatePath("/admin");

    return { ok: true, advanced: result.advanced, allDelivered: result.allDelivered };
  } catch (err) {
    console.error("[TICK_ORDER_ERROR]", err);
    const msg = err instanceof Error ? err.message : "";
    const code = msg === "ORDER_NOT_FOUND" ? "ORDER_NOT_FOUND" : "TICK_FAILED";
    return { ok: false, code };
  }
}
