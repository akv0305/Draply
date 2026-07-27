import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

// ── Money formatter ──────────────────────────────────────────────────────────
function formatPrice(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

// ── Category emoji map ────────────────────────────────────────────────────────
const CAT_EMOJI: Record<string, string> = {
  women: "👗",
  men: "👔",
  unisex: "🧥",
  "women-kurtas": "👘",
  "women-sarees": "🥻",
  "women-tops": "👚",
  "women-dresses": "👗",
  "women-ethnic-sets": "🪭",
  "men-shirts": "👕",
  "men-tshirts": "👕",
  "men-trousers": "👖",
  "men-kurtas": "🥷",
  "unisex-jackets": "🧥",
  "unisex-innerwear": "🩱",
  "unisex-accessories": "💍",
};

// ════════════════════════════════════════════════════════════════════════════
// Page
// ════════════════════════════════════════════════════════════════════════════
export default async function HomePage() {
  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [categories, stores, products] = await Promise.all([
    // Top-level categories (parentId is null), up to 6, sorted by sortOrder
    prisma.category.findMany({
      where: { parentId: null },
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: { id: true, slug: true, name: true },
    }),

    // 8 stores with merchant display name
    prisma.store.findMany({
      where: { status: "ONLINE" },
      take: 8,
      orderBy: { ratingCount: "desc" },
      select: {
        id: true,
        name: true,
        pincode: true,
        rating: true,
        avgPrepMins: true,
        merchant: { select: { displayName: true } },
      },
    }),

    // 12 active products with cheapest variant, store name, category name
    prisma.product.findMany({
      where: { isActive: true },
      take: 12,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        store: { select: { name: true } },
        category: { select: { name: true, slug: true } },
        variants: {
          orderBy: { pricePaise: "asc" },
          take: 1,
          select: { pricePaise: true, mrpPaise: true },
        },
      },
    }),
  ]);

  return (
    <div className="bg-white space-y-10">
      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="py-10 sm:py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="bg-gradient-to-br from-rose-50 via-white to-amber-50 rounded-3xl border border-rose-100 p-6 md:p-10 text-center">
            {/* Badge */}
            <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-600">
              ⚡ 30-minute delivery
            </div>

            {/* Headline */}
            <h1 className="mb-3 text-3xl md:text-5xl font-bold tracking-tight text-zinc-900">
              Boutique fashion,{" "}
              <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
                at your doorstep
              </span>
            </h1>

            {/* Tagline */}
            <p className="mb-2 text-rose-600 font-medium text-base">
              Try at home · Return what doesn&apos;t fit · Pay only for what you keep
            </p>

            {/* Subhead */}
            <p className="mx-auto mb-8 max-w-2xl text-base text-zinc-500">
              Discover handpicked clothing from Hyderabad&apos;s finest stores.
            </p>

            {/* Pincode chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {["500032", "500081", "500084"].map((pin) => (
                <span
                  key={pin}
                  className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-medium text-zinc-700 shadow-sm"
                >
                  📍 {pin}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────────────────── */}
      <section className="pb-4">
        <div className="mx-auto max-w-6xl px-4 space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 mb-1">
              Shop by category
            </h2>
            <p className="text-sm text-zinc-500">Shop by what you love</p>
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-zinc-400">No categories yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/c/${cat.slug}`} className="block">
                  <Card className="cursor-pointer rounded-2xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition">
                    <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <span className="text-4xl mb-2">
                        {CAT_EMOJI[cat.slug] ?? "👗"}
                      </span>
                      <span className="font-semibold text-sm text-zinc-700">
                        {cat.name}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── STORES ─────────────────────────────────────────────────────────── */}
      <section className="bg-zinc-50 py-10">
        <div className="mx-auto max-w-6xl px-4 space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 mb-1">
              Stores near you
            </h2>
            <p className="text-sm text-zinc-500">Boutiques near you</p>
          </div>
          {stores.length === 0 ? (
            <p className="text-sm text-zinc-400">No stores available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stores.map((store) => (
                <Link key={store.id} href={`/s/${store.id}`} className="block">
                <Card
                  className="overflow-hidden rounded-2xl border border-slate-200 hover:border-rose-300 hover:shadow-md transition"
                >
                  {/* Placeholder image area */}
                  <div className="relative aspect-video bg-gradient-to-br from-rose-100 to-amber-100">
                    <span className="absolute inset-0 flex items-center justify-center text-4xl">
                      🛍️
                    </span>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-bold text-base text-zinc-900 leading-tight">
                      {store.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {store.merchant.displayName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5">
                        📍 {store.pincode}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs text-rose-600 rounded-full px-2 py-0.5"
                      >
                        ⚡ {store.avgPrepMins} min
                      </Badge>
                      {store.rating > 0 && (
                        <Badge variant="outline" className="text-xs rounded-full px-2 py-0.5">
                          ⭐ {store.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── PRODUCTS ───────────────────────────────────────────────────────── */}
      <section className="pb-4">
        <div className="mx-auto max-w-6xl px-4 space-y-6">
          <div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 mb-1">
              Trending now
            </h2>
            <p className="text-sm text-zinc-500">Picked for you today</p>
          </div>
          {products.length === 0 ? (
            <p className="text-sm text-zinc-400">No products yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => {
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
                        <p className="mb-0.5 text-xs text-zinc-400">
                          {product.store.name}
                        </p>
                        <p className="font-semibold text-sm line-clamp-2 leading-tight text-zinc-900">
                          {product.title}
                        </p>
                        {cheapest && (
                          <div className="mt-1.5 flex items-baseline gap-2">
                            <span className="font-bold text-base text-slate-900">
                              {formatPrice(cheapest.pricePaise)}
                            </span>
                            {cheapest.mrpPaise > cheapest.pricePaise && (
                              <span className="text-xs text-slate-400 line-through">
                                {formatPrice(cheapest.mrpPaise)}
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
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-100 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-4 text-center py-8">
          <p className="text-xs text-slate-500">
            Draply · 30-minute fashion delivery
          </p>
        </div>
      </footer>
    </div>
  );
}
