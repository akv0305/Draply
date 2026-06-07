"use client";

import { useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateCartItemQty, removeCartItem } from "@/app/(customer)/cart/actions";
import type { CartLine } from "@/lib/cart/get-cart-summary";

// ── Money formatter ───────────────────────────────────────────────────────────
function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

// ════════════════════════════════════════════════════════════════════════════
// CartLineRow — Client Component
// ════════════════════════════════════════════════════════════════════════════
export default function CartLineRow({ line }: { line: CartLine }) {
  const [isPending, startTransition] = useTransition();

  const isOutOfStock = line.inStockQty === 0;
  const qtyExceedsStock = line.qty > line.inStockQty && line.inStockQty > 0;

  function handleQtyChange(newQty: number) {
    startTransition(async () => {
      const res = await updateCartItemQty(line.cartItemId, newQty);
      if (!res.ok) toast.error(res.message);
    });
  }

  function handleRemove() {
    startTransition(async () => {
      const res = await removeCartItem(line.cartItemId);
      if (!res.ok) toast.error(res.message);
    });
  }

  return (
    <Card className={isPending ? "opacity-60 transition-opacity" : ""}>
      <CardContent className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        {/* ── Image placeholder ─────────────────────────────────────────── */}
        <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-50 to-amber-50 text-3xl">
          👚
        </div>

        {/* ── Centre: product info ──────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Title linking to PDP */}
          <Link
            href={`/p/${line.productId}`}
            className="line-clamp-2 text-sm font-medium leading-snug text-zinc-900 hover:underline"
          >
            {line.productTitle}
          </Link>

          {/* Store name */}
          <p className="text-xs text-zinc-500">{line.storeName}</p>

          {/* Size + color chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
              {line.size}
            </span>
            <span className="inline-flex items-center gap-1 rounded border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600">
              {line.colorHex && (
                <span
                  className="inline-block h-3 w-3 rounded-full border border-zinc-200"
                  style={{ backgroundColor: line.colorHex }}
                />
              )}
              {line.color}
            </span>
          </div>

          {/* Stock warning */}
          {isOutOfStock && (
            <p className="text-xs font-medium text-rose-600">Out of stock</p>
          )}
          {qtyExceedsStock && !isOutOfStock && (
            <p className="text-xs font-medium text-rose-600">
              Only {line.inStockQty} available
            </p>
          )}
        </div>

        {/* ── Right: stepper + price + remove ──────────────────────────── */}
        <div className="flex flex-shrink-0 flex-col items-end justify-between gap-2">
          {/* Qty stepper */}
          <div className="flex items-center gap-1">
            {/* Decrement / trash when qty === 1 */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 text-base"
              disabled={isPending}
              onClick={() =>
                line.qty === 1
                  ? handleRemove()
                  : handleQtyChange(line.qty - 1)
              }
            >
              {line.qty === 1 ? "🗑️" : "−"}
            </Button>

            <span className="w-6 text-center text-sm font-semibold">
              {line.qty}
            </span>

            {/* Increment */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 w-7 p-0 text-base"
              disabled={
                isPending ||
                line.qty >= 10 ||
                (line.inStockQty > 0 && line.qty >= line.inStockQty)
              }
              onClick={() => handleQtyChange(line.qty + 1)}
            >
              +
            </Button>
          </div>

          {/* Price */}
          <div className="text-right">
            <p className="text-sm font-bold text-zinc-900">
              {fmt(line.lineTotalPaise)}
            </p>
            {line.qty > 1 && (
              <p className="text-xs text-zinc-400">
                {fmt(line.pricePaise)} each
              </p>
            )}
          </div>

          {/* Remove link */}
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
