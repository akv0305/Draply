"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  acceptSubOrder,
  markSubOrderPacked,
  markSubOrderPickedUp,
} from "@/app/(merchant)/actions";

interface MerchantActionsProps {
  subOrderId: string;
  status: string;
}

export default function MerchantActions({
  subOrderId,
  status,
}: MerchantActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2">
      {/* Accept order — enabled only when PENDING */}
      <Button
        variant="default"
        size="sm"
        disabled={status !== "PENDING" || isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await acceptSubOrder(subOrderId);
            if (res.ok) {
              toast.success("Marked ACCEPTED");
              router.refresh();
            } else {
              toast.error(res.message || "Action failed");
            }
          })
        }
      >
        Accept order
      </Button>

      {/* Mark packed — enabled only when ACCEPTED */}
      <Button
        variant="outline"
        size="sm"
        disabled={status !== "ACCEPTED" || isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await markSubOrderPacked(subOrderId);
            if (res.ok) {
              toast.success("Marked PACKED");
              router.refresh();
            } else {
              toast.error(res.message || "Action failed");
            }
          })
        }
      >
        Mark packed
      </Button>

      {/* Mark picked up — enabled only when PACKED */}
      <Button
        variant="outline"
        size="sm"
        disabled={status !== "PACKED" || isPending}
        onClick={() =>
          startTransition(async () => {
            const res = await markSubOrderPickedUp(subOrderId);
            if (res.ok) {
              toast.success("Marked PICKED UP");
              router.refresh();
            } else {
              toast.error(res.message || "Action failed");
            }
          })
        }
      >
        Mark picked up
      </Button>
    </div>
  );
}
