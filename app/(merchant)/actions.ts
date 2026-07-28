"use server";

import { revalidatePath } from "next/cache";
import { type SubOrderStatus, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

// ── Return type shared across all three exported actions ──────────────────────
type ActionResult =
  | { ok: true; newStatus: string; orderFullyDelivered: boolean }
  | { ok: false; code: string; message: string };

// ── Friendly messages keyed by error code ────────────────────────────────────
const ERROR_MESSAGES = {
  UNAUTHENTICATED: "Please sign in to continue.",
  FORBIDDEN: "Merchant access required.",
  NOT_FOUND: "Sub-order not found.",
  NOT_OWNER: "You can only manage your own store's orders.",
  INVALID_STATE: "This action isn't available in the current state.",
  ACTION_FAILED: "Something went wrong. Please try again.",
} as const;

// ── Private helper — owns all the transaction logic ───────────────────────────
async function transitionSubOrder(
  subOrderId: string,
  expectedCurrent: string,
  nextStatus: string,
  eventType: string
): Promise<ActionResult> {
  // ── 1. Auth guard ──────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false as const,
      code: "UNAUTHENTICATED",
      message: ERROR_MESSAGES.UNAUTHENTICATED,
    };
  }
  if (user.role !== "MERCHANT" && user.role !== "ADMIN") {
    return {
      ok: false as const,
      code: "FORBIDDEN",
      message: ERROR_MESSAGES.FORBIDDEN,
    };
  }

  // ── 2. Transaction ─────────────────────────────────────────────────────────
  try {
    const { newStatus, orderFullyDelivered, orderId } =
      await prisma.$transaction(async (tx) => {
        // 2a. Fetch sub-order with ownership chain
        const so = await tx.subOrder.findUnique({
          where: { id: subOrderId },
          include: {
            store: {
              select: {
                merchant: { select: { ownerId: true } },
              },
            },
          },
        });

        if (!so) throw new Error("NOT_FOUND");

        // 2b. Ownership check (ADMIN bypasses)
        if (
          user.role !== "ADMIN" &&
          so.store.merchant.ownerId !== user.id
        ) {
          throw new Error("NOT_OWNER");
        }

        // 2c. State guard
        if (so.status !== expectedCurrent) {
          throw new Error("INVALID_STATE");
        }

        // 2d. Advance sub-order
        await tx.subOrder.update({
          where: { id: subOrderId },
          data: { status: nextStatus as SubOrderStatus },
        });

        // 2e. Write audit event
        await tx.orderEvent.create({
          data: {
            orderId: so.orderId,
            type: eventType,
            actorId: user.id,
            payload: { subOrderId, from: expectedCurrent, to: nextStatus },
          },
        });

        // 2f. Safety check: are ALL sub-orders of the parent order DELIVERED?
        //     (This can't normally happen from a merchant PICKED_UP action in
        //     the current flow, but mirrors tickOrderProgress semantics.)
        const parentOrder = await tx.order.findUnique({
          where: { id: so.orderId },
          include: { subOrders: { select: { id: true, status: true } } },
        });

        // Compute the expected post-update statuses
        const updatedStatuses = parentOrder!.subOrders.map((x) =>
          x.id === subOrderId ? nextStatus : x.status
        );
        const allDelivered = updatedStatuses.every(
          (s) => s === "DELIVERED"
        );

        let orderFullyDelivered = false;

        if (allDelivered && parentOrder!.status !== "DELIVERED") {
          await tx.order.update({
            where: { id: so.orderId },
            data: { status: "DELIVERED" as OrderStatus },
          });
          await tx.orderEvent.create({
            data: {
              orderId: so.orderId,
              type: "ORDER_DELIVERED",
              actorId: user.id,
              payload: { orderId: so.orderId },
            },
          });
          orderFullyDelivered = true;
        }

        return {
          newStatus: nextStatus,
          orderFullyDelivered,
          orderId: so.orderId,
        };
      });

    // ── 3. Revalidate affected paths ─────────────────────────────────────────
    revalidatePath(`/merchant/orders/${subOrderId}`);
    revalidatePath("/merchant");
    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);

    return { ok: true, newStatus, orderFullyDelivered };
  } catch (err) {
    console.error("[MERCHANT_ACTION_ERROR]", err);
    const msg = err instanceof Error ? err.message : "";
    const code =
      msg === "NOT_FOUND" ||
      msg === "NOT_OWNER" ||
      msg === "INVALID_STATE"
        ? (msg as keyof typeof ERROR_MESSAGES)
        : ("ACTION_FAILED" as const);
    return {
      ok: false as const,
      code,
      message: ERROR_MESSAGES[code],
    };
  }
}

// ── Public exports ────────────────────────────────────────────────────────────

export async function acceptSubOrder(
  subOrderId: string
): Promise<ActionResult> {
  return transitionSubOrder(
    subOrderId,
    "PENDING",
    "ACCEPTED",
    "SUBORDER_ACCEPTED"
  );
}

export async function markSubOrderPacked(
  subOrderId: string
): Promise<ActionResult> {
  return transitionSubOrder(
    subOrderId,
    "ACCEPTED",
    "PACKED",
    "SUBORDER_PACKED"
  );
}

export async function markSubOrderPickedUp(
  subOrderId: string
): Promise<ActionResult> {
  return transitionSubOrder(
    subOrderId,
    "PACKED",
    "PICKED_UP",
    "SUBORDER_PICKED_UP"
  );
}
