"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleVendorStatus } from "@/actions/admin";

export function ToggleVendorButton({ businessId, status }: { businessId: string; status: "active" | "disabled" }) {
  const [pending, start] = useTransition();
  return (
    <Button
      variant={status === "active" ? "destructive" : "brand"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleVendorStatus(businessId);
          if (res.ok) toast.success(`Vendor ${res.status === "active" ? "enabled" : "disabled"}`);
          else toast.error(res.message);
        })
      }
    >
      {pending ? "Saving..." : status === "active" ? "Disable vendor" : "Enable vendor"}
    </Button>
  );
}
