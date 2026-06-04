"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InviteForm } from "./invite-form";

export function InviteBuyerDialog({
  storeUrl,
  businessName,
  trigger,
}: {
  storeUrl: string;
  businessName: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const triggerNode = trigger ?? (
    <Button variant="brand">
      <UserPlus className="h-4 w-4" />
      Invite buyer
    </Button>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) router.refresh();
      }}
    >
      <DialogTrigger asChild>{triggerNode}</DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invite buyer</DialogTitle>
          <DialogDescription>
            Add a buyer manually and share your store link with them.
          </DialogDescription>
        </DialogHeader>
        <InviteForm
          storeUrl={storeUrl}
          businessName={businessName}
          onSuccess={() => router.refresh()}
        />
      </DialogContent>
    </Dialog>
  );
}
