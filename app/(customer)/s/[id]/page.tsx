import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// ── Money formatter ───────────────────────────────────────────────────────────
const fmt = (p: number) =>
  `₹${(p / 100).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;

// ── Status badge helper ───────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "ONLINE") {
    return (
      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
        ONLINE
      </span>
    );
  }
  if (status === "PAUSED") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
        PAUSED
      </span>
    );
  }
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
      OFFLINE
    </span>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════════
export default async function StorePage({
  params,
}: {
  params: { id: string };
}) {
  // ── 1. Fetch store with merchant ──────────────────────────────────────────
  const store = await prisma.store.findUnique({
    where: { id: params.id },
    include: {
      merchant: { select: { displayName: true } },
    },
  });
  if (!store) notFound();

  // ── 2. Fetch active products from this store ──────────────────────────────
  const products = await prisma.product.findMany({
    where: { storeId: store.id, isActive: true },
    include: {
      category: { select: { name: true } },
      variants: {
        orderBy: { pricePaise: "asc" },
        take: 1,
        select: { pricePaise: true, mrpPaise: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  // ── 3. Filter to products with at least one variant ───────────────────────
  const filtered = products.filter((p) => p.variants.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-6">
      {/* ── A. Breadcrumb ─────────────────────────────────────────────────── */}
      <Link href="/" className="text-sm text-rose-600 hover:underline">
        ← Home
      </Link>

      {/* ── B. Store header card ──────────────────────────────────────────── */}
      <Card className="rounded-2xl border border-rose-100 bg-gradient-to-br from-rose-50 to-white">
        <CardContent className="relative p-6">
          {/* Status badge — top-right */}
          <div className="absolute top-4 right-4">
            <StatusBadge status={store.status} />
          </div>

          {/* Store name */}
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight pr-24">
            {store.name}
          </h1>

          {/* Merchant name */}
          <p className="mt-1 text-sm text-muted-foreground">
            by {store.merchant.displayName}
          </p>

          {/* Info row */}
          <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-600">
            <span>📍 {store.city} · {store.pincode}</span>
            <span>⏱ {store.avgPrepMins} min prep</span>
            {store.rating > 0 && (
              <span>
                ★ {store.rating.toFixed(1)} ({store.ratingCount})
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── C. Products header ────────────────────────────────────────────── */}
      <h2 className="text-xl font-bold">Products ({filtered.length})</h2>

      {/* ── D. Product grid ───────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <Card className="rounded-2xl border border-slate-200 p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No products from this store yet.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((product) => {
            const cheapest = product.variants[0];
            const hasDiscount =
              cheapest && cheapest.mrpPaise > cheapest.pricePaise;
            const discountPct =
              hasDiscount && cheapest
                ? Math.round(
                    ((cheapest.mrpPaise - cheapest.pricePaise) /
                      cheapest.mrpPaise) *
                      100
                  )
                : 0;
            return (
              <Link
                key={product.id}
                href={`/p/${product.id}`}
                className="block"
              >
                <Card className="rounded-2xl overflow-hidden border border-slate-200 hover:shadow-lg hover:-translate-y-0.5 transition">
                  {/* Placeholder image — aspect 3/4 */}
                  <div className="relative aspect-[3/4] bg-gradient-to-br from-rose-50 to-amber-50">
                    <span className="absolute inset-0 flex items-center justify-center text-5xl">
                      👚
                    </span>
                    {/* Category badge overlay */}
                    <div className="absolute bottom-2 left-2">
                      <Badge className="bg-white/80 text-xs text-zinc-700 backdrop-blur-sm hover:bg-white/80">
                        {product.category.name}
                      </Badge>
                    </div>
                    {/* Discount badge overlay */}
                    {hasDiscount && discountPct > 0 && (
                      <div className="absolute top-2 right-2">
                        <span className="bg-rose-100 text-rose-700 text-xs font-bold rounded-full px-2 py-0.5">
                          -{discountPct}%
                        </span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-3">
                    {/* NOTE: store name intentionally omitted — redundant on store page */}
                    <p className="font-semibold text-sm line-clamp-2 leading-tight text-zinc-900">
                      {product.title}
                    </p>
                    {cheapest && (
                      <div className="mt-1.5 flex items-baseline gap-2">
                        <span className="font-bold text-base text-slate-900">
                          {fmt(cheapest.pricePaise)}
                        </span>
                        {cheapest.mrpPaise > cheapest.pricePaise && (
                          <span className="text-xs text-slate-400 line-through">
                            {fmt(cheapest.mrpPaise)}
                          </span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
