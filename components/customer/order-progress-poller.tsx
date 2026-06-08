"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { tickOrderProgress } from "@/app/(customer)/orders/actions";

interface OrderProgressPollerProps {
  orderId: string;
  isComplete: boolean;
}

export function OrderProgressPoller({
  orderId,
  isComplete,
}: OrderProgressPollerProps) {
  const router = useRouter();
  // Use a ref to hold the interval handle so it's accessible inside the
  // async callback without stale-closure issues.
  const handleRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Don't start polling for completed orders
    if (isComplete) return;

    handleRef.current = setInterval(async () => {
      const res = await tickOrderProgress(orderId);
      if (res.ok) {
        router.refresh();
        if (res.allDelivered && handleRef.current !== null) {
          clearInterval(handleRef.current);
          handleRef.current = null;
        }
      }
    }, 5000);

    return () => {
      if (handleRef.current !== null) {
        clearInterval(handleRef.current);
        handleRef.current = null;
      }
    };
    // orderId is stable per page mount; isComplete drives the guard above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, isComplete]);

  // Completed orders: render nothing
  if (isComplete) return null;

  return (
    <div className="inline-flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
      <span className="inline-block w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
      Demo mode: auto-advancing
    </div>
  );
}
