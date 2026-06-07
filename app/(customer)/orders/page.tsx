import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

// ── Money formatter ───────────────────────────────────────────────────────────
const fmt = (p: number) =>
  `₹${(p / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

// ── Status → Tailwind colour classes ─────────────────────────────────────────
function statusColor(status: string): string {
  if (status === "PAID" || status === "STORE_NOTIFIED")
    return "bg-green-100 text-green-800 border-green-200";
  if (status === "CREATED" || status === "PAYMENT_PENDING")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "CANCELLED" || status === "FAILED")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

// ════════════════════════════════════════════════════════════════════════════
// Orders list page — Server Component
// ════════════════════════════════════════════════════════════════════════════
export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/orders");

  const orders = await prisma.order.findMany({
    where: { userId: user.id },
    orderBy: { placedAt: "desc" },
    take: 50,
    include: {
      items: {
        include: {
          variant: { include: { product: { select: { title: true } } } },
        },
      },
      subOrders: { include: { store: { select: { name: true } } } },
    },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Your orders</h1>
        <p className="text-sm text-muted-foreground">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      {orders.length === 0 ? (
        // ── Empty state ───────────────────────────────────────────────────
        <Card className="p-8 text-center">
          <p className="mb-4 text-muted-foreground">No orders yet.</p>
          <Link href="/">
            <Button>Start shopping</Button>
          </Link>
        </Card>
      ) : (
        // ── Order cards ───────────────────────────────────────────────────
        orders.map((o) => (
          <Link
            key={o.id}
            href={`/orders/${o.id}`}
            className="block transition hover:shadow-md"
          >
            <Card className="space-y-2 p-4">
              {/* ── Row 1: id + date + status badge ─────────────────────── */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs text-muted-foreground">
                    {o.id.slice(0, 8)}…
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(o.placedAt).toLocaleString("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
                <Badge className={statusColor(o.status)}>{o.status}</Badge>
              </div>

              {/* ── Row 2: first item title + overflow count ─────────────── */}
              <div className="text-sm">
                {o.items[0]?.variant.product.title ?? "Item"}
                {o.items.length > 1 && (
                  <span className="text-muted-foreground">
                    {" "}+ {o.items.length - 1} more
                  </span>
                )}
              </div>

              {/* ── Row 3: store names ───────────────────────────────────── */}
              <div className="text-xs text-muted-foreground">
                From: {o.subOrders.map((s) => s.store.name).join(", ")}
              </div>

              <Separator />

              {/* ── Row 4: total + payment info ──────────────────────────── */}
              <div className="flex items-center justify-between">
                <div className="font-bold">{fmt(o.totalPaise)}</div>
                <div className="text-xs text-muted-foreground">
                  {o.paymentMode} · {o.paymentStatus}
                </div>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
