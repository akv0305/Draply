import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import VariantPicker from "@/components/customer/variant-picker";

export const dynamic = "force-dynamic";

export default async function ProductPage({
  params,
}: {
  params: { id: string };
}) {
  // ── Data fetch ────────────────────────────────────────────────────────────
  const product = await prisma.product.findUnique({
    where: { id: params.id },
    include: {
      store: {
        select: {
          id: true,
          name: true,
          pincode: true,
          avgPrepMins: true,
          rating: true,
          ratingCount: true,
        },
      },
      category: { select: { id: true, name: true, slug: true } },
      variants: {
        orderBy: { pricePaise: "asc" },
        include: {
          inventory: { select: { qty: true } },
        },
      },
    },
  });

  if (!product || !product.isActive) notFound();

  // ── Build variant option list ─────────────────────────────────────────────
  const variantOptions = product.variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex,
    pricePaise: v.pricePaise,
    mrpPaise: v.mrpPaise,
    inStock: v.inventory.reduce((sum, inv) => sum + inv.qty, 0) > 0,
  }));

  // ── Attributes guard ──────────────────────────────────────────────────────
  const attrs =
    product.attributes &&
    typeof product.attributes === "object" &&
    !Array.isArray(product.attributes)
      ? (product.attributes as Record<string, unknown>)
      : null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      {/* ── Breadcrumb ───────────────────────────────────────────────────── */}
      <nav className="mb-4 text-xs text-zinc-500">
        <Link href="/" className="hover:text-zinc-700">
          Home
        </Link>
        <span className="mx-1.5">/</span>
        <span>{product.category.name}</span>
        <span className="mx-1.5">/</span>
        <span className="text-zinc-700">{product.title}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* ── LEFT: image gallery ──────────────────────────────────────── */}
        <div>
          {/* Main image placeholder */}
          <div className="flex aspect-[3/4] items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-rose-50 to-amber-50">
            <span className="text-9xl">👚</span>
          </div>
          {/* Thumbnail row */}
          <div className="mt-3 grid grid-cols-4 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex aspect-square items-center justify-center rounded bg-gradient-to-br from-rose-50 to-amber-50 text-2xl"
              >
                👚
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: product info ──────────────────────────────────────── */}
        <div className="space-y-4">
          {/* Brand + category badges */}
          <div className="flex flex-wrap gap-2">
            {product.brand && (
              <Badge variant="secondary">{product.brand}</Badge>
            )}
            <Badge variant="outline">{product.category.name}</Badge>
            {product.isTrialEligible && (
              <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                ✨ Try at home
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold tracking-tight">
            {product.title}
          </h1>

          {/* Store row */}
          <Link href="/" className="block">
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
              <span>Sold by</span>
              <span className="font-medium text-zinc-700">
                {product.store.name}
              </span>
              <span>·</span>
              <span>📍 {product.store.pincode}</span>
              <span>·</span>
              <span className="text-rose-600">
                ⚡ {product.store.avgPrepMins} min
              </span>
              {product.store.rating > 0 && (
                <>
                  <span>·</span>
                  <span>⭐ {product.store.rating.toFixed(1)}</span>
                </>
              )}
            </div>
          </Link>

          <Separator />

          {/* Variant picker — client component */}
          <VariantPicker
            variants={variantOptions}
            productId={product.id}
            isTrialEligible={product.isTrialEligible}
          />

          <Separator />

          {/* Description */}
          {product.description && (
            <div>
              <h2 className="mb-2 font-semibold text-zinc-900">
                About this product
              </h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-zinc-600">
                {product.description}
              </p>
            </div>
          )}

          {/* Attributes */}
          {attrs && Object.keys(attrs).length > 0 && (
            <div>
              <h2 className="mb-2 font-semibold text-zinc-900">Details</h2>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                {Object.entries(attrs).map(([k, v]) => (
                  <div
                    key={k}
                    className="flex justify-between border-b border-zinc-100 py-1"
                  >
                    <dt className="capitalize text-zinc-500">
                      {k.replace(/_/g, " ")}
                    </dt>
                    <dd className="font-medium text-zinc-800">{String(v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {/* Trust badges */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            <div className="rounded border border-zinc-100 p-2 text-center">
              <div className="text-2xl">⚡</div>
              <div className="mt-1 text-xs text-zinc-500">30-min delivery</div>
            </div>
            <div className="rounded border border-zinc-100 p-2 text-center">
              <div className="text-2xl">↩️</div>
              <div className="mt-1 text-xs text-zinc-500">Easy returns</div>
            </div>
            <div className="rounded border border-zinc-100 p-2 text-center">
              <div className="text-2xl">🛡️</div>
              <div className="mt-1 text-xs text-zinc-500">Verified store</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
