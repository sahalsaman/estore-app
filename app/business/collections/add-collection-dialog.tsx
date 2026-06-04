"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createCollectionAction } from "@/actions/payment-collections";
import { CollectionForm, type BuyerOption } from "./collection-form";

export function AddCollectionDialog({
  buyers,
  defaultBuyerPhone,
  trigger,
}: {
  buyers: BuyerOption[];
  defaultBuyerPhone?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const triggerNode = trigger ?? (
    <Button variant="brand">
      <Plus className="h-4 w-4" />
      Record payment collection
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record payment collection</DialogTitle>
          <DialogDescription>
            Log a payment received from a buyer.
          </DialogDescription>
        </DialogHeader>
        <CollectionForm
          action={createCollectionAction}
          buyers={buyers}
          defaultBuyerPhone={defaultBuyerPhone}
          submitLabel="Record payment collection"
          onSuccess={() => {
            toast.success("Payment collection recorded");
            setOpen(false);
            router.refresh();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
