"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { markOrderAsPackedAction } from "@/actions/orders";

export function MarkAsPackedButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="brand"
      disabled={pending}
      onClick={() => {
        if (
          !confirm(
            "Mark this order as packed? Items will be locked, an invoice will be generated for the ticked items, and a Cash payment collection will be recorded for the bill amount."
          )
        ) {
          return;
        }
        start(async () => {
          const res = await markOrderAsPackedAction(orderId);
          if (res.ok) {
            toast.success("Order packed and invoice generated");
            router.refresh();
          } else {
            toast.error(res.message);
          }
        });
      }}
    >
      <PackageCheck className="h-4 w-4" />
      {pending ? "Packing..." : "Mark as packed"}
    </Button>
  );
}
