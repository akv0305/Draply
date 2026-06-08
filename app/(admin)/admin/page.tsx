import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (p: number) =>
  `₹${(p / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

function orderStatusColor(s: string): string {
  if (s === "PAID" || s === "STORE_NOTIFIED" || s === "DELIVERED")
    return "bg-green-100 text-green-800 border-green-200";
  if (s === "CREATED" || s === "PAYMENT_PENDING")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "CANCELLED" || s === "FAILED")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function kycColor(s: string): string {
  if (s === "APPROVED") return "bg-green-100 text-green-800 border-green-200";
  if (s === "PENDING") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "REJECTED" || s === "SUSPENDED")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function storeStatusColor(s: string): string {
  if (s === "ONLINE") return "bg-green-100 text-green-800 border-green-200";
  if (s === "PAUSED") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function AdminDashboardPage() {
  // ── 1. Auth guard (defense in depth) ─────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/admin");
  if (user.role !== "ADMIN") redirect("/");

  // ── 2. Stat counts (parallel) ─────────────────────────────────────────────
  const [userCount, merchantCount, storeCount, productCount, orderCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.merchant.count(),
      prisma.store.count(),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
    ]);

  // ── 3. Recent orders ──────────────────────────────────────────────────────
  const recentOrders = await prisma.order.findMany({
    orderBy: { placedAt: "desc" },
    take: 20,
    include: {
      user: { select: { phone: true, name: true } },
      items: { select: { id: true } },
      subOrders: { select: { id: true } },
    },
  });

  // ── 4. Merchants with stores ──────────────────────────────────────────────
  const merchants = await prisma.merchant.findMany({
    orderBy: { displayName: "asc" },
    include: {
      owner: { select: { phone: true } },
      stores: { select: { id: true } },
    },
  });

  // Sub-order counts grouped by storeId — used to compute per-merchant totals
  const subOrderGroups = await prisma.subOrder.groupBy({
    by: ["storeId"],
    _count: { id: true },
  });

  // Build a lookup: storeId → subOrder count
  const subOrderCountByStore = new Map<string, number>(
    subOrderGroups.map((g) => [g.storeId, g._count.id])
  );

  // ── 5. Stores ─────────────────────────────────────────────────────────────
  const stores = await prisma.store.findMany({
    orderBy: { name: "asc" },
    take: 50,
    include: {
      merchant: { select: { displayName: true } },
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* ── Section A: Page header ────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Platform overview · read-only
        </p>
      </div>

      {/* ── Section B: Stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {/* Users */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Users
            </p>
            <p className="text-3xl font-bold">{userCount.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Merchants */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Merchants
            </p>
            <p className="text-3xl font-bold">
              {merchantCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Stores */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Stores
            </p>
            <p className="text-3xl font-bold">{storeCount.toLocaleString()}</p>
          </CardContent>
        </Card>

        {/* Active products */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Active products
            </p>
            <p className="text-3xl font-bold">
              {productCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Orders
            </p>
            <p className="text-3xl font-bold">{orderCount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Section C: Recent orders ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Recent orders</h2>

        {recentOrders.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No orders yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Order ID
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Customer
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Placed at
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Items
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Stores
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Total
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Payment
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                      {/* Order ID */}
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {o.id.slice(0, 8)}…
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm">{o.user.phone}</p>
                        {o.user.name && (
                          <p className="text-xs text-muted-foreground">
                            {o.user.name}
                          </p>
                        )}
                      </td>

                      {/* Placed at */}
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(o.placedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>

                      {/* Items count */}
                      <td className="px-4 py-3 text-center">
                        {o.items.length}
                      </td>

                      {/* Stores (sub-orders) count */}
                      <td className="px-4 py-3 text-center">
                        {o.subOrders.length}
                      </td>

                      {/* Total */}
                      <td className="px-4 py-3 whitespace-nowrap font-medium">
                        {fmt(o.totalPaise)}
                      </td>

                      {/* Payment */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-sm">{o.paymentMode}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.paymentStatus}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${orderStatusColor(
                            o.status
                          )}`}
                        >
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Section D: Merchants table ────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Merchants ({merchants.length})
        </h2>

        {merchants.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No merchants yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Display name
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Owner phone
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      KYC
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Commission
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-center">
                      Stores
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap text-center">
                      Total orders
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {merchants.map((m) => {
                    // Sum sub-order counts across all stores for this merchant
                    const totalOrders = m.stores.reduce(
                      (sum, s) =>
                        sum + (subOrderCountByStore.get(s.id) ?? 0),
                      0
                    );

                    return (
                      <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                        {/* Display name + legal name */}
                        <td className="px-4 py-3">
                          <p className="font-semibold">{m.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.legalName}
                          </p>
                        </td>

                        {/* Owner phone */}
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">
                          {m.owner.phone}
                        </td>

                        {/* KYC */}
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${kycColor(
                              m.kycStatus
                            )}`}
                          >
                            {m.kycStatus}
                          </span>
                        </td>

                        {/* Commission */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {m.commissionBps / 100}%
                        </td>

                        {/* Stores count */}
                        <td className="px-4 py-3 text-center">
                          {m.stores.length}
                        </td>

                        {/* Total orders */}
                        <td className="px-4 py-3 text-center">
                          {totalOrders}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Section E: Stores table ───────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Stores ({stores.length})</h2>

        {stores.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No stores yet.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Store name
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Merchant
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Location
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Rating
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Prep
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stores.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                      {/* Store name */}
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">
                        {s.name}
                      </td>

                      {/* Merchant */}
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {s.merchant.displayName}
                      </td>

                      {/* City · Pincode */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.city} · {s.pincode}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${storeStatusColor(
                            s.status
                          )}`}
                        >
                          {s.status}
                        </span>
                      </td>

                      {/* Rating */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        ★ {s.rating.toFixed(1)} ({s.ratingCount})
                      </td>

                      {/* Prep */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {s.avgPrepMins} min
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
