"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface MerchantActionsProps {
  subOrderId: string; // reserved for Phase 2 server-action wiring
  status: string;
}

export default function MerchantActions(props: MerchantActionsProps) {
  const { status } = props;

  return (
    <div className="flex flex-wrap gap-2">
      {/* Accept order — enabled only when PENDING */}
      <Button
        variant="default"
        size="sm"
        disabled={status !== "PENDING"}
        onClick={() =>
          toast.success("Accept order stub — wiring in Phase 2")
        }
      >
        Accept order
      </Button>

      {/* Mark packed — enabled only when ACCEPTED */}
      <Button
        variant="outline"
        size="sm"
        disabled={status !== "ACCEPTED"}
        onClick={() =>
          toast.success("Mark packed stub — wiring in Phase 2")
        }
      >
        Mark packed
      </Button>

      {/* Mark picked up — enabled only when PACKED */}
      <Button
        variant="outline"
        size="sm"
        disabled={status !== "PACKED"}
        onClick={() =>
          toast.success("Mark picked up stub — wiring in Phase 2")
        }
      >
        Mark picked up
      </Button>
    </div>
  );
}
