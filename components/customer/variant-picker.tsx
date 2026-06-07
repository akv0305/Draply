"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";

// ── Money formatter ───────────────────────────────────────────────────────────
function fmt(paise: number) {
  return "₹" + (paise / 100).toLocaleString("en-IN");
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type VariantOption = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  pricePaise: number;
  mrpPaise: number;
  inStock: boolean;
};

type Props = {
  variants: VariantOption[];
  productId: string;
  isTrialEligible: boolean;
};

// ════════════════════════════════════════════════════════════════════════════
// VariantPicker — Client Component
// ════════════════════════════════════════════════════════════════════════════
export default function VariantPicker({
  variants,
  isTrialEligible,
}: Props) {
  // ── Unique sizes preserving first-seen order ──────────────────────────────
  // Computed before hooks so initial state is correct.
  const uniqueSizes = Array.from(new Set(variants.map((v) => v.size)));
  const firstSize = uniqueSizes[0] ?? "";
  const firstColor = variants.find((v) => v.size === firstSize)?.color ?? "";

  // ── State — must be called BEFORE any early return ────────────────────────
  const [selectedSize, setSelectedSize] = useState<string>(firstSize);
  const [selectedColor, setSelectedColor] = useState<string>(firstColor);

  // Guard: no variants at all (after hooks)
  if (variants.length === 0) {
    return (
      <p className="py-2 text-sm text-zinc-500">Currently unavailable.</p>
    );
  }

  // ── Derived values ────────────────────────────────────────────────────────
  const availableColorsForSize = Array.from(
    new Set(
      variants.filter((v) => v.size === selectedSize).map((v) => v.color)
    )
  );

  const selectedVariant =
    variants.find(
      (v) => v.size === selectedSize && v.color === selectedColor
    ) ?? null;

  const discount =
    selectedVariant && selectedVariant.mrpPaise > selectedVariant.pricePaise
      ? Math.round(
          ((selectedVariant.mrpPaise - selectedVariant.pricePaise) /
            selectedVariant.mrpPaise) *
            100
        )
      : 0;

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleSizeClick(size: string) {
    setSelectedSize(size);
    // Reset color to first available for new size
    const firstColor =
      variants.find((v) => v.size === size)?.color ?? "";
    setSelectedColor(firstColor);
  }

  function handleColorClick(color: string) {
    setSelectedColor(color);
  }

  function handleAddToCart() {
    if (!selectedVariant) return;
    toast.success(
      `Added ${selectedVariant.size}/${selectedVariant.color} to cart (stub)`
    );
  }

  function handleTryAtHome() {
    if (!selectedVariant) return;
    toast.success(
      `Try at home: ${selectedVariant.size}/${selectedVariant.color} (stub)`
    );
  }

  const canAct = !!selectedVariant && selectedVariant.inStock;

  return (
    <div className="space-y-5">
      {/* ── Size picker ───────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-700">Size</p>
        <div className="flex flex-wrap gap-2">
          {uniqueSizes.map((size) => (
            <button
              key={size}
              onClick={() => handleSizeClick(size)}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition-colors",
                selectedSize === size
                  ? "border-rose-500 bg-rose-50 text-rose-600 font-semibold"
                  : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
              )}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* ── Color picker ──────────────────────────────────────────────────── */}
      <div>
        <p className="mb-2 text-sm font-semibold text-zinc-700">Color</p>
        <div className="flex flex-wrap gap-2">
          {availableColorsForSize.map((color) => {
            const variant = variants.find(
              (v) => v.size === selectedSize && v.color === color
            );
            const hex = variant?.colorHex ?? "#cccccc";
            const isActive = selectedColor === color;
            return (
              <button
                key={color}
                onClick={() => handleColorClick(color)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors",
                  isActive
                    ? "border-rose-500 ring-2 ring-rose-200"
                    : "border-zinc-200 hover:border-zinc-400"
                )}
              >
                {/* 4×4 color dot */}
                <span
                  className="inline-block h-4 w-4 rounded-full border border-zinc-200"
                  style={{ backgroundColor: hex }}
                />
                <span className="text-zinc-700">{color}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Price block ───────────────────────────────────────────────────── */}
      {selectedVariant ? (
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold text-zinc-900">
            {fmt(selectedVariant.pricePaise)}
          </span>
          {selectedVariant.mrpPaise > selectedVariant.pricePaise && (
            <>
              <span className="text-base text-zinc-400 line-through">
                {fmt(selectedVariant.mrpPaise)}
              </span>
              {discount > 0 && (
                <span className="text-sm font-semibold text-emerald-600">
                  {discount}% OFF
                </span>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-sm text-zinc-500">Select size and color</p>
      )}

      {/* ── Stock status ──────────────────────────────────────────────────── */}
      {selectedVariant && (
        <div className="flex items-center gap-1.5">
          {selectedVariant.inStock ? (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-emerald-600">In stock</span>
            </>
          ) : (
            <>
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
              <span className="text-xs text-rose-600">Out of stock</span>
            </>
          )}
        </div>
      )}

      {/* ── Action buttons ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          className="w-full sm:w-auto"
          disabled={!canAct}
          onClick={handleAddToCart}
        >
          Add to Cart
        </Button>
        {isTrialEligible && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            disabled={!canAct}
            onClick={handleTryAtHome}
          >
            Try at Home
          </Button>
        )}
      </div>
    </div>
  );
}
