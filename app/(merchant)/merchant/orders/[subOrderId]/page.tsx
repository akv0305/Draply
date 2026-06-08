import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import MerchantActions from "@/components/merchant/merchant-actions";

// ── SubOrder status badge colour ──────────────────────────────────────────────
function subOrderStatusColor(status: string): string {
  if (status === "PENDING")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (
    status === "ACCEPTED" ||
    status === "PACKED" ||
    status === "PICKED_UP"
  )
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (status === "DELIVERED")
    return "bg-green-100 text-green-800 border-green-200";
  if (status === "CANCELLED" || status === "REJECTED")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

interface PageProps {
  params: { subOrderId: string };
}

export default async function SubOrderDetailPage({ params }: PageProps) {
  // ── 1. Auth guard ─────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/merchant");

  // ── 2. Merchant lookup ────────────────────────────────────────────────────
  const merchant = await prisma.merchant.findFirst({
    where: { ownerId: user.id },
  });

  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-xl">Not a registered merchant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your account is not linked to a merchant profile.
            </p>
            <Link
              href="/"
              className="text-sm text-rose-600 hover:underline inline-block"
            >
              ← Back to home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── 3. Fetch sub-order (with security filter) ─────────────────────────────
  const subOrder = await prisma.subOrder.findFirst({
    where: {
      id: params.subOrderId,
      store: { merchantId: merchant.id }, // security: only own merchant's sub-orders
    },
    include: {
      store: { select: { name: true, pincode: true } },
      order: {
        select: {
          id: true,
          placedAt: true,
          totalPaise: true,
          paymentMode: true,
          paymentStatus: true,
          deliveryAddress: { select: { pincode: true, city: true } },
        },
      },
      items: {
        include: {
          variant: {
            include: {
              product: { select: { title: true } },
            },
          },
        },
      },
    },
  });

  if (!subOrder) notFound();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* ── Back link ─────────────────────────────────────────────────────── */}
      <Link
        href="/merchant"
        className="text-sm text-rose-600 hover:underline inline-block"
      >
        ← Back to dashboard
      </Link>

      {/* ── Header card ───────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="pt-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Sub-order
              </p>
              <h1 className="text-xl font-bold font-mono">
                {subOrder.id.slice(0, 8)}…
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Store: {subOrder.store.name}
              </p>
            </div>
            <span
              className={`inline-flex self-start sm:self-auto items-center rounded-full border px-3 py-1 text-xs font-semibold ${subOrderStatusColor(
                subOrder.status
              )}`}
            >
              {subOrder.status}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Order metadata card ────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Order details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Order ID</span>
            <span className="font-mono text-xs">{subOrder.order.id}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Placed at</span>
            <span>
              {new Date(subOrder.order.placedAt).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Customer pincode</span>
            <span>
              {subOrder.order.deliveryAddress?.pincode ?? "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span>
              {subOrder.order.paymentMode} · {subOrder.order.paymentStatus}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total</span>
            <span className="font-medium">
              ₹
              {(subOrder.order.totalPaise / 100).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* ── Pickup OTP card ────────────────────────────────────────────────── */}
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-amber-900">Pickup OTP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-3xl font-mono font-bold tracking-widest text-amber-800">
            {subOrder.pickupOtp ?? "—"}
          </p>
          <p className="text-xs text-amber-700">
            Share this with the rider at pickup.
          </p>
        </CardContent>
      </Card>

      {/* ── Items card ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Items ({subOrder.items.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {subOrder.items.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-4 px-6 py-3"
              >
                <div className="space-y-0.5">
                  <p className="font-medium text-sm">
                    {item.variant.product.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant.size} · {item.variant.color}
                  </p>
                </div>
                <div className="text-right text-sm shrink-0">
                  <p className="text-muted-foreground">
                    {item.qty} ×{" "}
                    ₹
                    {(item.unitPricePaise / 100).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="font-semibold">
                    ₹
                    {(item.lineTotalPaise / 100).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Actions (client component) ────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <MerchantActions
            subOrderId={subOrder.id}
            status={subOrder.status}
          />
        </CardContent>
      </Card>
    </div>
  );
}
