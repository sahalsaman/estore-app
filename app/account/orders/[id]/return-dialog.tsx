"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { createReturnAction } from "@/actions/returns";

export type ReturnableItem = {
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string;
  price: number;
  returnableQuantity: number;
};

export function ReturnDialog({ orderId, items }: { orderId: string; items: ReturnableItem[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [qtys, setQtys] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");

  const eligible = useMemo(() => items.filter((it) => it.returnableQuantity > 0), [items]);
  const key = (it: ReturnableItem) => `${it.productId}|${it.variantId ?? ""}`;

  const setQty = (it: ReturnableItem, value: number) =>
    setQtys((prev) => ({ ...prev, [key(it)]: Math.max(0, Math.min(it.returnableQuantity, Math.floor(value || 0))) }));

  const lines = eligible
    .map((it) => ({ it, qty: qtys[key(it)] ?? 0 }))
    .filter((l) => l.qty > 0);
  const total = lines.reduce((s, l) => s + l.it.price * l.qty, 0);

  const reset = () => {
    setQtys({});
    setReason("");
  };

  const onSubmit = () => {
    if (lines.length === 0) {
      toast.error("Choose at least one item to return");
      return;
    }
    start(async () => {
      const res = await createReturnAction(
        orderId,
        lines.map((l) => ({ productId: l.it.productId, variantId: l.it.variantId, quantity: l.qty })),
        reason.trim() || undefined
      );
      if (res.ok) {
        toast.success("Return requested — the seller will review it");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(n) => { setOpen(n); if (!n) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="brand">
          <RotateCcw className="h-4 w-4" /> Request return
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request a return</DialogTitle>
          <DialogDescription>
            Choose the items and quantities you want to return. The seller approves or rejects it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="divide-y rounded-md border">
            {eligible.map((it) => (
              <div key={key(it)} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {it.name}
                    {it.variantLabel ? <span className="text-muted-foreground"> · {it.variantLabel}</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(it.price)} · up to {it.returnableQuantity} returnable
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={it.returnableQuantity}
                  value={qtys[key(it)] || ""}
                  placeholder="0"
                  disabled={pending}
                  onChange={(e) => setQty(it, Number(e.target.value))}
                  className="h-9 w-20 text-center"
                />
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. wrong size, damaged on arrival"
              rows={2}
              disabled={pending}
            />
          </div>

          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="text-muted-foreground">Return value</span>
            <span className="text-lg font-semibold">{formatCurrency(total)}</span>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="button" variant="brand" onClick={onSubmit} disabled={pending || lines.length === 0}>
              {pending ? "Submitting..." : "Submit return"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
