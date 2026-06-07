"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils/cn";

// ── Types ─────────────────────────────────────────────────────────────────────
type AddressLite = {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  pincode: string;
  state: string;
  isDefault: boolean;
};

type SummaryLite = {
  subtotalPaise: number;
  itemCount: number;
  storeIds: string[];
};

type Props = {
  addresses: AddressLite[];
  defaultAddressId: string | null;
  summary: SummaryLite;
};

// ════════════════════════════════════════════════════════════════════════════
// CheckoutForm — unified Client Component
// Owns: address selection, payment mode, place-order stub button
// ════════════════════════════════════════════════════════════════════════════
export default function CheckoutForm({
  addresses,
  defaultAddressId,
  summary,
}: Props) {
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(
    defaultAddressId
  );
  const [paymentMode, setPaymentMode] = useState<"UPI" | "COD">("UPI");
  const [isPending, startTransition] = useTransition();

  // Empty-addresses guard (page-level branch should prevent this, but kept for safety)
  if (addresses.length === 0) {
    return <p className="text-sm text-zinc-500">No addresses available.</p>;
  }

  function handlePlaceOrder() {
    if (!selectedAddressId) {
      toast.error("Please select a delivery address");
      return;
    }
    startTransition(async () => {
      // Simulate async latency to demonstrate isPending loading state
      await new Promise<void>((r) => setTimeout(r, 600));
      toast.success(
        `STUB: Would place order to address ${selectedAddressId} via ${paymentMode}`
      );
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Section 1: Delivery address ─────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Delivery address
        </h2>
        <div className="space-y-3">
          {addresses.map((address) => {
            const isSelected = selectedAddressId === address.id;
            return (
              <button
                key={address.id}
                type="button"
                onClick={() => setSelectedAddressId(address.id)}
                className={cn(
                  "w-full rounded-lg border p-4 text-left transition-all",
                  isSelected
                    ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500"
                    : "border-zinc-200 hover:border-zinc-400"
                )}
              >
                {/* Top row: label badge + default badge + selected pill */}
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {address.label}
                  </Badge>
                  {address.isDefault && (
                    <Badge
                      variant="outline"
                      className="border-emerald-300 text-emerald-700"
                    >
                      Default
                    </Badge>
                  )}
                  {isSelected && (
                    <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Selected
                    </span>
                  )}
                </div>

                {/* Address lines */}
                <p className="mt-2 text-sm font-medium text-zinc-900">
                  {address.line1}
                </p>
                {address.line2 && (
                  <p className="text-sm text-zinc-700">{address.line2}</p>
                )}
                {address.landmark && (
                  <p className="text-xs italic text-zinc-500">
                    Near {address.landmark}
                  </p>
                )}
                <p className="text-sm text-zinc-600">
                  {address.city} - {address.pincode}, {address.state}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Section 2: Payment mode ──────────────────────────────────────────── */}
      <section>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          Payment method
        </h2>
        <RadioGroup
          value={paymentMode}
          onValueChange={(v: string) =>
            setPaymentMode(v as "UPI" | "COD")
          }
          className="grid gap-3 sm:grid-cols-2"
        >
          {/* ── UPI option ───────────────────────────────────────────────── */}
          <Label
            htmlFor="pm-upi"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all",
              paymentMode === "UPI"
                ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500"
                : "border-zinc-200 hover:border-zinc-400"
            )}
          >
            <RadioGroupItem value="UPI" id="pm-upi" className="mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-zinc-900">UPI</p>
              <p className="text-xs text-zinc-500">
                Pay instantly via UPI app
              </p>
              <Badge variant="secondary" className="mt-2 text-[10px]">
                MOCK — auto-authorized
              </Badge>
            </div>
            <span className="text-2xl leading-none">📱</span>
          </Label>

          {/* ── COD option ───────────────────────────────────────────────── */}
          <Label
            htmlFor="pm-cod"
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-all",
              paymentMode === "COD"
                ? "border-rose-500 bg-rose-50 ring-2 ring-rose-500"
                : "border-zinc-200 hover:border-zinc-400"
            )}
          >
            <RadioGroupItem value="COD" id="pm-cod" className="mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-zinc-900">Cash on Delivery</p>
              <p className="text-xs text-zinc-500">
                Pay when items are delivered
              </p>
              <Badge variant="secondary" className="mt-2 text-[10px]">
                MOCK
              </Badge>
            </div>
            <span className="text-2xl leading-none">💵</span>
          </Label>
        </RadioGroup>
      </section>

      {/* ── Section 3: Place-order button (STUB) ────────────────────────────── */}
      <div>
        <Button
          className="h-12 w-full text-base"
          disabled={!selectedAddressId || isPending}
          onClick={handlePlaceOrder}
        >
          {isPending
            ? "Placing order…"
            : `Place order · ₹${(summary.subtotalPaise / 100).toLocaleString(
                "en-IN"
              )}`}
        </Button>
        <p className="mt-2 text-center text-xs text-zinc-400">
          ⚠️ STUB — order placement wired in the next update
        </p>
      </div>
    </div>
  );
}
