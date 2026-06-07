import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export const dynamic = "force-dynamic";

// ── Money formatter ───────────────────────────────────────────────────────────
function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

// ════════════════════════════════════════════════════════════════════════════
// Order detail page — minimal placeholder (full UI in Prompt #8)
// ════════════════════════════════════════════════════════════════════════════
export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/orders/${params.id}`);

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      deliveryAddress: true,
      items: {
        include: {
          variant: {
            include: {
              product: { select: { title: true } },
            },
          },
        },
      },
      subOrders: {
        include: {
          store: { select: { name: true, pincode: true } },
        },
      },
    },
  });

  if (!order || order.userId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* ── Back link ───────────────────────────────────────────────────────── */}
      <Link href="/orders" className="text-sm text-rose-600 hover:underline">
        ← Back to orders
      </Link>

      {/* ── Success banner ──────────────────────────────────────────────────── */}
      <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50 p-6 text-center">
        <div className="mb-2 text-5xl">✅</div>
        <h1 className="text-2xl font-bold text-emerald-900">Order placed!</h1>
        <p className="mt-1 text-sm text-emerald-700">
          Order ID:{" "}
          <span className="font-mono text-xs">{order.id}</span>
        </p>
        <p className="mt-2 text-xs text-emerald-600">
          Estimated delivery in 30 minutes
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-5">
          {/* ── Order header ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-900">Order summary</h2>
            <Badge variant="secondary">{order.status}</Badge>
          </div>
          <Separator />

          {/* ── Items list ────────────────────────────────────────────────── */}
          <div className="space-y-2">
            {order.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {item.variant.product.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.variant.size} · {item.variant.color} · Qty {item.qty}
                  </p>
                </div>
                <span className="font-medium">{fmt(item.lineTotalPaise)}</span>
              </div>
            ))}
          </div>

          <Separator />

          {/* ── Totals ────────────────────────────────────────────────────── */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-600">Items total</span>
              <span>{fmt(order.itemsTotalPaise)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">Delivery</span>
              <span className="text-emerald-600">FREE</span>
            </div>
            <div className="flex justify-between pt-1 text-base font-semibold">
              <span>Total paid</span>
              <span>{fmt(order.totalPaise)}</span>
            </div>
            <div className="flex justify-between pt-1 text-xs text-zinc-500">
              <span>Payment</span>
              <span>
                {order.paymentMode} · {order.paymentStatus}
              </span>
            </div>
          </div>

          <Separator />

          {/* ── Delivery address ──────────────────────────────────────────── */}
          <div>
            <h3 className="mb-1 text-sm font-semibold text-zinc-900">
              Delivering to
            </h3>
            <p className="text-sm text-zinc-700">
              {order.deliveryAddress.label}
            </p>
            <p className="text-xs text-zinc-500">
              {order.deliveryAddress.line1}
              {order.deliveryAddress.line2
                ? `, ${order.deliveryAddress.line2}`
                : ""}
              {", "}
              {order.deliveryAddress.city} - {order.deliveryAddress.pincode}
            </p>
          </div>

          <Separator />

          {/* ── Sub-orders (one per store) ────────────────────────────────── */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-zinc-900">
              Stores ({order.subOrders.length})
            </h3>
            <div className="space-y-1.5">
              {order.subOrders.map((so) => (
                <div
                  key={so.id}
                  className="flex items-center justify-between rounded border border-zinc-100 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-medium text-zinc-800">{so.store.name}</p>
                    <p className="text-zinc-500">📍 {so.store.pincode}</p>
                  </div>
                  <Badge variant="outline">{so.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CTA buttons ─────────────────────────────────────────────────────── */}
      <div className="mt-6 flex gap-3">
        <Link href="/" className="flex-1">
          <Button variant="outline" className="w-full">
            Continue shopping
          </Button>
        </Link>
        <Link href="/orders" className="flex-1">
          <Button className="w-full">View all orders</Button>
        </Link>
      </div>
    </div>
  );
}
