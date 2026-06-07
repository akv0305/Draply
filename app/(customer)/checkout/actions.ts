"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCartSummary } from "@/lib/cart/get-cart-summary";
import { ok, err, type Result } from "@/lib/utils/result";

// ── Helper: generate a random 4-digit OTP string ─────────────────────────────
function generateOtp(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ════════════════════════════════════════════════════════════════════════════
// placeOrder — Server Action
//
// Creates Order + SubOrders (1 per store) + OrderItems + decrements
// InventoryLedger with an optimistic-lock version check + clears Cart +
// writes an OrderEvent audit row — all in a single Prisma $transaction.
// ════════════════════════════════════════════════════════════════════════════
export async function placeOrder(input: {
  addressId: string;
  paymentMode: "UPI" | "COD";
}): Promise<Result<{ orderId: string }>> {
  // ── STEP 1: Auth guard (before transaction) ──────────────────────────────
  const user = await getCurrentUser();
  if (!user) return err("UNAUTHENTICATED", "Please sign in to place an order");

  // ── STEP 2: Validate address belongs to this user ────────────────────────
  const address = await prisma.address.findFirst({
    where: { id: input.addressId, userId: user.id },
  });
  if (!address) return err("INVALID_ADDRESS", "Address not found");

  // ── STEP 3: Validate cart (fast-fail before hitting the transaction) ──────
  const summary = await getCartSummary();
  if (summary.lines.length === 0)
    return err("EMPTY_CART", "Your cart is empty");
  if (summary.subtotalPaise <= 0)
    return err("INVALID_TOTAL", "Invalid cart total");

  // Stock pre-check using the already-fetched summary
  for (const line of summary.lines) {
    if (line.qty > line.inStockQty) {
      return err(
        "OUT_OF_STOCK",
        `${line.productTitle} (${line.size}/${line.color}) — only ${line.inStockQty} left`
      );
    }
    if (!line.productActive) {
      return err(
        "PRODUCT_INACTIVE",
        `${line.productTitle} is no longer available`
      );
    }
  }

  // ── STEP 4: Prisma $transaction ───────────────────────────────────────────
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // 4a. Re-fetch cart inside transaction for consistency
        const cart = await tx.cart.findUnique({
          where: { userId: user.id },
          include: { items: true },
        });
        if (!cart || cart.items.length === 0) {
          throw new Error("EMPTY_CART_RACE");
        }

        const variantIds = cart.items.map((i) => i.variantId);
        const variants = await tx.variant.findMany({
          where: { id: { in: variantIds } },
          include: {
            product: { select: { id: true, storeId: true, isActive: true } },
          },
        });
        const variantMap = new Map(variants.map((v) => [v.id, v]));

        // 4b. Inventory decrement with optimistic-lock version
        for (const item of cart.items) {
          const v = variantMap.get(item.variantId);
          if (!v) throw new Error(`VARIANT_GONE:${item.variantId}`);
          if (!v.product.isActive)
            throw new Error(`PRODUCT_INACTIVE:${item.variantId}`);

          const ledger = await tx.inventoryLedger.findUnique({
            where: {
              variantId_storeId: {
                variantId: v.id,
                storeId: v.product.storeId,
              },
            },
          });
          if (!ledger) throw new Error(`NO_LEDGER:${item.variantId}`);
          if (ledger.qty < item.qty)
            throw new Error(`OUT_OF_STOCK:${item.variantId}`);

          // Optimistic-lock update — only proceeds if version is unchanged
          const updated = await tx.inventoryLedger.updateMany({
            where: {
              id: ledger.id,
              version: ledger.version,
            },
            data: {
              qty: { decrement: item.qty },
              version: { increment: 1 },
            },
          });
          if (updated.count !== 1) {
            throw new Error(`CONCURRENT_UPDATE:${item.variantId}`);
          }
        }

        // 4c. Group cart lines by storeId
        const linesByStore = new Map<
          string,
          Array<{
            variantId: string;
            qty: number;
            unitPricePaise: number;
            lineTotalPaise: number;
          }>
        >();

        for (const item of cart.items) {
          const v = variantMap.get(item.variantId)!;
          const storeId = v.product.storeId;
          const lineTotal = v.pricePaise * item.qty;
          const entry = {
            variantId: v.id,
            qty: item.qty,
            unitPricePaise: v.pricePaise,
            lineTotalPaise: lineTotal,
          };
          if (!linesByStore.has(storeId)) linesByStore.set(storeId, []);
          linesByStore.get(storeId)!.push(entry);
        }

        // 4d. Calculate totals
        const allLines = ([] as Array<{ variantId: string; qty: number; unitPricePaise: number; lineTotalPaise: number }>).concat(
          ...Array.from(linesByStore.values())
        );
        const itemsTotalPaise = allLines.reduce(
          (sum, l) => sum + l.lineTotalPaise,
          0
        );
        const deliveryFeePaise = 0; // free for MVP
        const discountPaise = 0;
        const taxPaise = 0;
        const totalPaise =
          itemsTotalPaise + deliveryFeePaise + taxPaise - discountPaise;

        // 4e. Determine payment status
        const paymentStatus: "AUTHORIZED" | "INITIATED" =
          input.paymentMode === "UPI" ? "AUTHORIZED" : "INITIATED";

        // 4f. Create Order row
        const order = await tx.order.create({
          data: {
            userId: user.id,
            type: "NORMAL",
            status: "PAID", // UPI mock = paid; COD also PAID for demo
            deliveryAddressId: input.addressId,
            itemsTotalPaise,
            deliveryFeePaise,
            discountPaise,
            taxPaise,
            totalPaise,
            paymentMode: input.paymentMode,
            paymentStatus,
            paymentTxnId:
              input.paymentMode === "UPI"
                ? `MOCK_UPI_${Date.now()}`
                : null,
            promisedDeliveryAt: new Date(Date.now() + 30 * 60 * 1000), // 30 min
          },
        });

        // 4g. Create one SubOrder per store + bulk-create OrderItems for it
        const subOrderIds: string[] = [];
        for (const [storeId, lines] of Array.from(linesByStore.entries())) {
          const subOrder = await tx.subOrder.create({
            data: {
              orderId: order.id,
              storeId,
              status: "PENDING",
              pickupOtp: generateOtp(),
              dropOtp: generateOtp(),
            },
          });
          subOrderIds.push(subOrder.id);

          await tx.orderItem.createMany({
            data: lines.map((l) => ({
              orderId: order.id,
              subOrderId: subOrder.id,
              variantId: l.variantId,
              qty: l.qty,
              unitPricePaise: l.unitPricePaise,
              lineTotalPaise: l.lineTotalPaise,
            })),
          });
        }

        // 4h. Clear the cart
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

        // 4i. Write OrderEvent audit row
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "ORDER_PLACED",
            actorId: user.id,
            payload: {
              paymentMode: input.paymentMode,
              paymentStatus,
              totalPaise,
              storeCount: linesByStore.size,
              subOrderIds,
            },
          },
        });

        // 4j. Return order id
        return { orderId: order.id };
      },
      { timeout: 15000, maxWait: 5000 }
    );

    // ── STEP 5: Post-transaction revalidation ──────────────────────────────
    revalidatePath("/", "layout"); // refresh cart badge in BottomNavServer
    revalidatePath("/cart");
    revalidatePath("/orders");
    return ok({ orderId: result.orderId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";

    // Map internal throw codes to friendly Result errors
    if (msg.startsWith("OUT_OF_STOCK"))
      return err(
        "OUT_OF_STOCK",
        "An item went out of stock during checkout. Please review your cart."
      );
    if (msg.startsWith("CONCURRENT_UPDATE"))
      return err(
        "CONCURRENT",
        "Another shopper just took the last piece — please retry."
      );
    if (msg.startsWith("VARIANT_GONE") || msg.startsWith("NO_LEDGER"))
      return err(
        "UNAVAILABLE",
        "An item became unavailable. Please refresh your cart."
      );
    if (msg.startsWith("PRODUCT_INACTIVE"))
      return err(
        "UNAVAILABLE",
        "An item is no longer sold. Please refresh your cart."
      );
    if (msg === "EMPTY_CART_RACE")
      return err("EMPTY_CART", "Your cart was emptied. Please add items again.");

    // Unexpected error — log for diagnosis and return generic message
    console.error("placeOrder transaction failed:", e);
    return err("ORDER_FAILED", "We couldn't place your order. Please try again.");
  }
}
