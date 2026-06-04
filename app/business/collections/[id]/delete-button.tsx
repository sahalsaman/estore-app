"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteCollectionAction } from "@/actions/payment-collections";

export function DeleteCollectionButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() => {
        if (!confirm("Delete this payment collection entry? This cannot be undone.")) return;
        start(async () => {
          const res = await deleteCollectionAction(id);
          if (res.ok) {
            toast.success("Payment collection deleted");
            router.push("/business/collections");
            router.refresh();
          } else {
            toast.error(res.message);
          }
        });
      }}
    >
      <Trash2 className="h-4 w-4" />
      {pending ? "Deleting..." : "Delete"}
    </Button>
  );
}
