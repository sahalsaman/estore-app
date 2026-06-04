"use client";

import { useActionState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  placeOrderAction,
  removeFromCartAction,
  updateCartItemAction,
  type CheckoutState,
} from "@/actions/orders";
import { formatCurrency } from "@/lib/utils";
import type { CartItem } from "@/types";

export function CartCheckout({ vendorId, items }: { vendorId: string; items: CartItem[] }) {
  const [pending, start] = useTransition();
  const [state, action, submitting] = useActionState<CheckoutState, FormData>(placeOrderAction, undefined);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const e = state?.fieldErrors;

  return (
    <div className="divide-y">
      <div className="divide-y">
        {items.map((it) => (
          <div key={`${it.productId}|${it.variantId ?? ""}`} className="flex items-center gap-4 p-4">
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt={it.name} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-1 font-medium">{it.name}</p>
              {it.variantLabel && (
                <p className="text-xs text-muted-foreground">{it.variantLabel}</p>
              )}
              <p className="text-sm text-muted-foreground">{formatCurrency(it.price)} each</p>
            </div>
            <Input
              type="number"
              min={1}
              defaultValue={it.quantity}
              className="w-20"
              disabled={pending}
              onBlur={(ev) => {
                const q = Math.max(1, Number(ev.target.value));
                if (q === it.quantity) return;
                start(async () => {
                  await updateCartItemAction(it.productId, q, it.variantId);
                });
              }}
            />
            <p className="w-24 text-right font-semibold">{formatCurrency(it.price * it.quantity)}</p>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Remove"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await removeFromCartAction(it.productId, it.variantId);
                  toast.success("Removed");
                })
              }
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>

      <form action={action} className="space-y-4 p-6">
        <input type="hidden" name="vendorId" value={vendorId} />
        <h3 className="text-lg font-semibold">Your details</h3>
        <p className="text-sm text-muted-foreground">No account needed — just leave your name and mobile so the vendor can reach you.</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" name="name" placeholder="Jane Retailer" />
            {e?.name && <p className="text-sm text-destructive">{e.name[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Mobile number</Label>
            <Input id="phone" name="phone" placeholder="9876543210" inputMode="tel" />
            {e?.phone && <p className="text-sm text-destructive">{e.phone[0]}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Delivery address (optional)</Label>
          <Textarea id="address" name="address" rows={2} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes (optional)</Label>
          <Textarea id="notes" name="notes" rows={2} placeholder="Any specific requirements?" />
        </div>

        {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-xl font-semibold">Total: {formatCurrency(total)}</p>
          <Button type="submit" variant="brand" size="lg" disabled={pending || submitting}>
            {submitting ? "Placing order..." : "Place order"}
          </Button>
        </div>
      </form>
    </div>
  );
}
