import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ── KYC status badge colour ───────────────────────────────────────────────────
function kycColor(status: string): string {
  if (status === "APPROVED")
    return "bg-green-100 text-green-800 border-green-200";
  if (status === "PENDING")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "REJECTED" || status === "SUSPENDED")
    return "bg-red-100 text-red-800 border-red-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

// ── Store status badge colour ─────────────────────────────────────────────────
function storeStatusColor(status: string): string {
  if (status === "ONLINE") return "bg-green-100 text-green-800 border-green-200";
  if (status === "PAUSED") return "bg-amber-100 text-amber-800 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

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

export default async function MerchantDashboardPage() {
  // ── 1. Auth guard ─────────────────────────────────────────────────────────
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/merchant");

  // ── 2. Merchant lookup ────────────────────────────────────────────────────
  const merchant = await prisma.merchant.findFirst({
    where: { ownerId: user.id },
    include: { stores: true },
  });

  // ── 3. Not a merchant ─────────────────────────────────────────────────────
  if (!merchant) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-xl">Not a registered merchant</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Your account is not linked to a merchant profile. Please contact
              support to get set up as a merchant.
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

  // ── 4. Fetch sub-orders across all merchant stores ────────────────────────
  const storeIds = merchant.stores.map((s) => s.id);

  const subOrders = await prisma.subOrder.findMany({
    where: { storeId: { in: storeIds } },
    orderBy: { id: "desc" },
    take: 20,
    include: {
      store: { select: { name: true } },
      order: {
        select: {
          id: true,
          placedAt: true,
          totalPaise: true,
          paymentMode: true,
        },
      },
      items: true, // OrderItem[] — used for count only
    },
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Section A: Merchant header card ──────────────────────────────── */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold">{merchant.displayName}</h1>
              <p className="text-sm text-muted-foreground">
                {merchant.legalName}
              </p>
              <p className="text-sm text-muted-foreground">
                Commission:{" "}
                <span className="font-medium text-zinc-700">
                  {merchant.commissionBps / 100}%
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${kycColor(
                  merchant.kycStatus
                )}`}
              >
                KYC: {merchant.kycStatus}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section B: Stores grid ────────────────────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Your stores ({merchant.stores.length})
        </h2>

        {merchant.stores.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No stores set up yet.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {merchant.stores.map((store) => (
              <Card key={store.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{store.name}</p>
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${storeStatusColor(
                        store.status
                      )}`}
                    >
                      {store.status}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {store.pincode} · {store.city}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      ★ {store.rating.toFixed(1)} ({store.ratingCount})
                    </span>
                    <span>Prep: {store.avgPrepMins} min</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* ── Section C: Recent sub-orders table ───────────────────────────── */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold">
          Recent orders ({subOrders.length})
        </h2>

        {subOrders.length === 0 ? (
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
                      Placed at
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Store
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Items
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Total
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium whitespace-nowrap">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {subOrders.map((so) => (
                    <tr key={so.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                        {so.order.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {new Date(so.order.placedAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {so.store.name}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {so.items.length}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        ₹
                        {(so.order.totalPaise / 100).toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${subOrderStatusColor(
                            so.status
                          )}`}
                        >
                          {so.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/merchant/orders/${so.id}`}
                          className="text-rose-600 hover:underline text-sm"
                        >
                          Manage →
                        </Link>
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
