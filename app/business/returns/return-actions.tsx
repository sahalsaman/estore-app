"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateReturnStatusAction } from "@/actions/returns";

export function ReturnActions({ returnId }: { returnId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const run = (decision: "approve" | "reject") =>
    start(async () => {
      const res = await updateReturnStatusAction(returnId, decision);
      if (res.ok) {
        toast.success(decision === "approve" ? "Return approved — stock restored" : "Return rejected");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });

  return (
    <div className="flex justify-end gap-2">
      <Button variant="outline" size="sm" disabled={pending} onClick={() => run("reject")}>
        <X className="h-3.5 w-3.5" /> Reject
      </Button>
      <Button variant="brand" size="sm" disabled={pending} onClick={() => run("approve")}>
        <Check className="h-3.5 w-3.5" /> Approve
      </Button>
    </div>
  );
}
