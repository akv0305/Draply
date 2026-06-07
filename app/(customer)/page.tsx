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
    <div className="bg-white">
      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-rose-50 via-white to-amber-50 py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 text-center">
          {/* Badge */}
          <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-4 py-1.5 text-sm font-medium text-rose-600">
            ⚡ 30-minute delivery
          </div>

          {/* Headline */}
          <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-zinc-900 sm:text-5xl lg:text-6xl">
            Boutique fashion,{" "}
            <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
              at your doorstep
            </span>
          </h1>

          {/* Subhead */}
          <p className="mx-auto mb-8 max-w-2xl text-base text-zinc-500 sm:text-lg">
            Discover handpicked clothing from Hyderabad&apos;s finest stores.
            Try at home, return what doesn&apos;t fit.
          </p>

          {/* Pincode badges */}
          <div className="flex flex-wrap justify-center gap-2">
            {["500032", "500081", "500084"].map((pin) => (
              <span
                key={pin}
                className="rounded-full bg-white px-4 py-1.5 text-sm font-medium text-zinc-700 shadow-sm ring-1 ring-zinc-200"
              >
                📍 {pin}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ─────────────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900">
            Shop by category
          </h2>
          {categories.length === 0 ? (
            <p className="text-sm text-zinc-400">No categories yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {categories.map((cat) => (
                <Card
                  key={cat.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                >
                  <CardContent className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                    <span className="text-3xl">
                      {CAT_EMOJI[cat.slug] ?? "👗"}
                    </span>
                    <span className="text-sm font-medium text-zinc-700">
                      {cat.name}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── STORES ─────────────────────────────────────────────────────────── */}
      <section className="bg-zinc-50 py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900">
            Stores near you
          </h2>
          {stores.length === 0 ? (
            <p className="text-sm text-zinc-400">No stores available.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {stores.map((store) => (
                <Card
                  key={store.id}
                  className="overflow-hidden transition-shadow hover:shadow-md"
                >
                  {/* Placeholder image area */}
                  <div className="relative aspect-video bg-gradient-to-br from-rose-100 to-amber-100">
                    <span className="absolute inset-0 flex items-center justify-center text-4xl">
                      🛍️
                    </span>
                  </div>
                  <CardContent className="p-3">
                    <p className="font-semibold text-zinc-900 leading-tight">
                      {store.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      {store.merchant.displayName}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="text-xs">
                        📍 {store.pincode}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="text-xs text-rose-600"
                      >
                        ⚡ {store.avgPrepMins} min
                      </Badge>
                      {store.rating > 0 && (
                        <Badge variant="outline" className="text-xs">
                          ⭐ {store.rating.toFixed(1)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── PRODUCTS ───────────────────────────────────────────────────────── */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-6 text-2xl font-bold text-zinc-900">
            Trending now
          </h2>
          {products.length === 0 ? (
            <p className="text-sm text-zinc-400">No products yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => {
                const cheapest = product.variants[0];
                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden transition-shadow hover:shadow-md"
                  >
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
                    </div>

                    <CardContent className="p-3">
                      <p className="mb-0.5 text-xs text-zinc-400">
                        {product.store.name}
                      </p>
                      <p className="line-clamp-2 text-sm font-medium leading-tight text-zinc-900">
                        {product.title}
                      </p>
                      {cheapest && (
                        <div className="mt-1.5 flex items-baseline gap-2">
                          <span className="text-base font-bold text-zinc-900">
                            {formatPrice(cheapest.pricePaise)}
                          </span>
                          {cheapest.mrpPaise > cheapest.pricePaise && (
                            <span className="text-xs text-zinc-400 line-through">
                              {formatPrice(cheapest.mrpPaise)}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-100 bg-zinc-50 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="text-sm font-medium text-zinc-600">
            Draply • Hyderabad • Fashion in 30 minutes
          </p>
          <p className="mt-1 text-xs text-zinc-400">MVP build</p>
        </div>
      </footer>
    </div>
  );
}
