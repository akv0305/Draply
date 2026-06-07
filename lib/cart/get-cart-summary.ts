// server-only helper — do NOT import in Client Components
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";

// ── Types ─────────────────────────────────────────────────────────────────────
export type CartLine = {
  cartItemId: string;
  variantId: string;
  qty: number;
  productId: string;
  productTitle: string;
  productActive: boolean;
  storeId: string;
  storeName: string;
  size: string;
  color: string;
  colorHex: string | null;
  pricePaise: number;
  mrpPaise: number;
  lineTotalPaise: number;
  inStockQty: number;
};

export type CartSummary = {
  lines: CartLine[];
  itemCount: number;        // total qty across lines
  distinctCount: number;    // number of distinct lines
  subtotalPaise: number;
  mrpSubtotalPaise: number;
  savingsPaise: number;
  storeIds: string[];       // distinct storeIds for multi-store warning
};

const EMPTY: CartSummary = {
  lines: [],
  itemCount: 0,
  distinctCount: 0,
  subtotalPaise: 0,
  mrpSubtotalPaise: 0,
  savingsPaise: 0,
  storeIds: [],
};

// ════════════════════════════════════════════════════════════════════════════
// getCartSummary
// NOTE: CartItem has NO variant relation in the schema, so we use a
// two-step query: first load CartItems, then batch-fetch Variants + Products
// + InventoryLedger entries in a single prisma.variant.findMany call.
// ════════════════════════════════════════════════════════════════════════════
export async function getCartSummary(): Promise<CartSummary> {
  const user = await getCurrentUser();
  if (!user) return EMPTY;

  const cart = await prisma.cart.findUnique({
    where: { userId: user.id },
    include: {
      items: { orderBy: { addedAt: "desc" } },
    },
  });

  if (!cart || cart.items.length === 0) return EMPTY;

  // ── Step 2: batch-fetch all referenced variants ───────────────────────────
  const variantIds = cart.items.map((i) => i.variantId);
  const variants = await prisma.variant.findMany({
    where: { id: { in: variantIds } },
    include: {
      product: {
        select: { id: true, title: true, isActive: true, storeId: true },
      },
      inventory: { select: { qty: true } },
    },
  });
  const variantMap = new Map(variants.map((v) => [v.id, v]));

  // ── Step 3: batch-fetch all referenced stores ─────────────────────────────
  const storeIds = Array.from(
    new Set(variants.map((v) => v.product.storeId))
  );
  const stores = await prisma.store.findMany({
    where: { id: { in: storeIds } },
    select: { id: true, name: true },
  });
  const storeMap = new Map(stores.map((s) => [s.id, s]));

  // ── Build lines ───────────────────────────────────────────────────────────
  const lines: CartLine[] = [];
  let subtotalPaise = 0;
  let mrpSubtotalPaise = 0;
  let itemCount = 0;

  for (const item of cart.items) {
    const v = variantMap.get(item.variantId);
    if (!v) continue; // variant deleted — silently skip
    const store = storeMap.get(v.product.storeId);
    const inStockQty = v.inventory.reduce((sum, inv) => sum + inv.qty, 0);
    const lineTotal = v.pricePaise * item.qty;

    lines.push({
      cartItemId: item.id,
      variantId: v.id,
      qty: item.qty,
      productId: v.product.id,
      productTitle: v.product.title,
      productActive: v.product.isActive,
      storeId: v.product.storeId,
      storeName: store?.name ?? "Unknown store",
      size: v.size,
      color: v.color,
      colorHex: v.colorHex,
      pricePaise: v.pricePaise,
      mrpPaise: v.mrpPaise,
      lineTotalPaise: lineTotal,
      inStockQty,
    });

    subtotalPaise += lineTotal;
    mrpSubtotalPaise += v.mrpPaise * item.qty;
    itemCount += item.qty;
  }

  return {
    lines,
    itemCount,
    distinctCount: lines.length,
    subtotalPaise,
    mrpSubtotalPaise,
    savingsPaise: Math.max(0, mrpSubtotalPaise - subtotalPaise),
    storeIds,
  };
}
