import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getCartSummary } from "@/lib/cart/get-cart-summary";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import CheckoutForm from "@/components/customer/checkout-form";

export const dynamic = "force-dynamic";

// ── Money formatter ───────────────────────────────────────────────────────────
function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

// ════════════════════════════════════════════════════════════════════════════
// Checkout page — Server Component
// ════════════════════════════════════════════════════════════════════════════
export default async function CheckoutPage() {
  // 1. Auth guard
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/checkout");

  // 2. Cart guard — must have items to proceed
  const summary = await getCartSummary();
  if (summary.lines.length === 0) redirect("/cart");

  // 3. Fetch user's addresses, default first
  const addresses = await prisma.address.findMany({
    where: { userId: user.id },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  // 4. Pre-select default address (or first if no default flagged)
  const defaultAddressId =
    addresses.find((a) => a.isDefault)?.id ?? addresses[0]?.id ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900">Checkout</h1>

      {addresses.length === 0 ? (
        // ── No addresses edge-case ──────────────────────────────────────────
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
          <p className="text-sm text-amber-800">
            You don&apos;t have any saved addresses yet. Address management
            arrives in the next update — for now please contact support.
          </p>
          <Link href="/cart" className="mt-3 inline-block">
            <Button variant="outline" size="sm">
              Back to cart
            </Button>
          </Link>
        </div>
      ) : (
        // ── Main layout: form (2/3) + summary (1/3) ────────────────────────
        <div className="grid gap-6 lg:grid-cols-3">
          {/* LEFT: address picker + payment radios + place-order */}
          <div className="lg:col-span-2">
            <CheckoutForm
              addresses={addresses.map((a) => ({
                id: a.id,
                label: a.label,
                line1: a.line1,
                line2: a.line2,
                landmark: a.landmark,
                city: a.city,
                pincode: a.pincode,
                state: a.state,
                isDefault: a.isDefault,
              }))}
              defaultAddressId={defaultAddressId}
              summary={{
                subtotalPaise: summary.subtotalPaise,
                itemCount: summary.itemCount,
                storeIds: summary.storeIds,
              }}
            />
          </div>

          {/* RIGHT: server-rendered order summary (sticky on desktop) */}
          <div className="lg:col-span-1">
            <Card className="sticky top-20">
              <CardContent className="space-y-3 p-5">
                <h2 className="font-semibold text-zinc-900">Order summary</h2>
                <Separator />

                {/* Compact line list — scrollable */}
                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {summary.lines.map((line) => (
                    <div
                      key={line.cartItemId}
                      className="flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-zinc-800">
                          {line.productTitle}
                        </p>
                        <p className="text-zinc-500">
                          {line.size} · {line.color} · Qty {line.qty}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-zinc-800">
                        {fmt(line.lineTotalPaise)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">
                    Subtotal ({summary.itemCount})
                  </span>
                  <span className="font-medium">
                    {fmt(summary.subtotalPaise)}
                  </span>
                </div>

                {/* Savings */}
                {summary.savingsPaise > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">You save</span>
                    <span className="font-medium text-emerald-600">
                      − {fmt(summary.savingsPaise)}
                    </span>
                  </div>
                )}

                {/* Delivery */}
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-600">Delivery</span>
                  <span className="font-medium text-emerald-600">FREE</span>
                </div>

                <Separator />

                {/* Total */}
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-xl font-bold">
                    {fmt(summary.subtotalPaise)}
                  </span>
                </div>

                {/* Multi-store warning */}
                {summary.storeIds.length > 1 && (
                  <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
                    ⚠️ Items from {summary.storeIds.length} stores
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
