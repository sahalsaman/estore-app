"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, MessageCircle, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteBuyerAction, type InviteFormState } from "@/actions/buyer-invites";

function buildWhatsappUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, "");
  const intl = digits.length === 10 ? `91${digits}` : digits;
  return `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;
}

export function InviteForm({
  storeUrl,
  businessName,
  onSuccess,
}: {
  storeUrl: string;
  businessName: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<InviteFormState, FormData>(
    inviteBuyerAction,
    undefined
  );
  const [copied, setCopied] = useState(false);
  const e = state?.fieldErrors;

  useEffect(() => {
    if (state?.ok) {
      toast.success(
        state.created ? `Invited ${state.sharedName}` : `Updated ${state.sharedName}`
      );
      onSuccess?.();
    }
    if (state?.error) toast.error(state.error);
  }, [state, onSuccess]);

  const inviteMessage = state?.sharedName
    ? `Hi ${state.sharedName}, you can now order from ${businessName}: ${storeUrl}`
    : `Hi! You can now order from ${businessName}: ${storeUrl}`;

  return (
    <div>
      <form action={formAction} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="buyerName">Name</Label>
          <Input
            id="buyerName"
            name="buyerName"
            placeholder="Jane Retailer"
            defaultValue={state?.sharedName}
          />
          {e?.buyerName && <p className="text-sm text-destructive">{e.buyerName[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="buyerPhone">Phone</Label>
          <Input
            id="buyerPhone"
            name="buyerPhone"
            placeholder="9876543210"
            inputMode="tel"
            defaultValue={state?.sharedPhone}
          />
          {e?.buyerPhone && <p className="text-sm text-destructive">{e.buyerPhone[0]}</p>}
        </div>
        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" variant="brand" disabled={pending}>
          <UserPlus className="h-4 w-4" />
          {pending ? "Saving..." : "Save buyer"}
        </Button>
      </form>

      {state?.ok && state.sharedPhone && storeUrl && (
        <div className="mt-6 space-y-3 rounded-md border bg-muted/30 p-4">
          <p className="text-sm font-medium">Share your store with {state.sharedName}</p>
          <p className="break-all rounded bg-background px-2 py-1 font-mono text-xs">{storeUrl}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="brand" asChild>
              <a
                href={buildWhatsappUrl(state.sharedPhone, inviteMessage)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(storeUrl);
                  setCopied(true);
                  toast.success("Store link copied");
                  setTimeout(() => setCopied(false), 2000);
                } catch {
                  toast.error("Copy failed");
                }
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
