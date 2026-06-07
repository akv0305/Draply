import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCartSummary } from "@/lib/cart/get-cart-summary";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import CartLineRow from "@/components/customer/cart-line-row";
import { clearCart } from "@/app/(customer)/cart/actions";

export const dynamic = "force-dynamic";

// ── Thin void-returning wrapper so <form action> TypeScript is satisfied ───────
// React's form action type requires (formData: FormData) => void | Promise<void>
async function clearCartAction(): Promise<void> {
  "use server";
  await clearCart();
}

// ── Money formatter ───────────────────────────────────────────────────────────
function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

// ════════════════════════════════════════════════════════════════════════════
// Cart page — Server Component
// ════════════════════════════════════════════════════════════════════════════
export default async function CartPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/cart");

  const summary = await getCartSummary();

  // ── Empty state ───────────────────────────────────────────────────────────
  if (summary.lines.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <span className="text-7xl">🛒</span>
        <h1 className="text-2xl font-bold text-zinc-900">
          Your cart is empty
        </h1>
        <p className="text-sm text-zinc-500">
          Add items from the store to get started.
        </p>
        <Link href="/">
          <Button>Start shopping</Button>
        </Link>
      </div>
    );
  }

  const hasMultipleStores = summary.storeIds.length > 1;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl font-bold text-zinc-900">Your cart</h1>
        <Badge variant="secondary">
          {summary.distinctCount}{" "}
          {summary.distinctCount === 1 ? "item" : "items"}
        </Badge>
      </div>

      {/* ── Multi-store warning ───────────────────────────────────────────── */}
      {hasMultipleStores && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Items from multiple stores — delivery fees may apply per store
        </div>
      )}

      {/* ── Main layout: lines (2/3) + summary (1/3) ─────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cart lines */}
        <div className="space-y-3 lg:col-span-2">
          {summary.lines.map((line) => (
            <CartLineRow key={line.cartItemId} line={line} />
          ))}
        </div>

        {/* Order summary — sticky on desktop */}
        <div className="lg:col-span-1">
          <Card className="sticky top-20">
            <CardContent className="space-y-4 p-5">
              <h2 className="font-semibold text-zinc-900">Order summary</h2>
              <Separator />

              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">
                  Subtotal ({summary.itemCount}{" "}
                  {summary.itemCount === 1 ? "item" : "items"})
                </span>
                <span className="font-medium">{fmt(summary.subtotalPaise)}</span>
              </div>

              {/* Savings */}
              {summary.savingsPaise > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-600">You save</span>
                  <span className="font-medium text-emerald-600">
                    − {fmt(summary.savingsPaise)}
                  </span>
                </div>
              )}

              {/* Delivery */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-600">Delivery</span>
                <span className="font-medium text-emerald-600">FREE</span>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900">Total</span>
                <span className="text-xl font-bold text-zinc-900">
                  {fmt(summary.subtotalPaise)}
                </span>
              </div>

              {/* Proceed to checkout */}
              <Link href="/checkout" className="block">
                <Button className="w-full">Proceed to Checkout</Button>
              </Link>

              {/* Clear cart */}
              <form action={clearCartAction}>
                <Button
                  variant="ghost"
                  size="sm"
                  type="submit"
                  className="w-full text-zinc-400 hover:text-rose-500"
                >
                  Clear cart
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
