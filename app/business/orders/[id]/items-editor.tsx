"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Minus, Plus, Save, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateOrderItemsAction } from "@/actions/orders";
import { formatCurrency } from "@/lib/utils";

export type EditableOrderItem = {
  productId: string;
  variantId: string | null;
  variantLabel: string;
  name: string;
  price: number;
  quantity: number;
  included: boolean;
};

type RowState = { quantity: number; included: boolean };

// A row is keyed by product + variant since one product can appear as several
// variant lines in the same order.
const rowKey = (it: { productId: string; variantId: string | null }) =>
  `${it.productId}|${it.variantId ?? ""}`;

export function OrderItemsEditor({
  orderId,
  items,
}: {
  orderId: string;
  items: EditableOrderItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<Record<string, RowState>>(
    Object.fromEntries(
      items.map((it) => [rowKey(it), { quantity: it.quantity, included: it.included }])
    )
  );

  const setQty = (id: string, q: number) =>
    setState((prev) => ({
      ...prev,
      [id]: { ...prev[id], quantity: Math.max(1, Math.floor(q || 1)) },
    }));

  const setIncluded = (id: string, included: boolean) =>
    setState((prev) => ({ ...prev, [id]: { ...prev[id], included } }));

  const currentTotal = items.reduce((s, it) => {
    const r = state[rowKey(it)];
    if (!r || !r.included) return s;
    return s + it.price * r.quantity;
  }, 0);
  const originalTotal = items.reduce(
    (s, it) => s + (it.included ? it.price * it.quantity : 0),
    0
  );
  const changed = items.filter((it) => {
    const r = state[rowKey(it)];
    return r && (r.quantity !== it.quantity || r.included !== it.included);
  });
  const dirty = changed.length > 0;
  const allUnchecked = items.every((it) => !state[rowKey(it)]?.included);

  const onSave = () => {
    const updates = changed.map((it) => ({
      productId: it.productId,
      variantId: it.variantId,
      quantity: state[rowKey(it)].quantity,
      included: state[rowKey(it)].included,
    }));
    start(async () => {
      const res = await updateOrderItemsAction(orderId, updates);
      if (res.ok) {
        toast.success("Order items updated");
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  const onReset = () =>
    setState(
      Object.fromEntries(
        items.map((it) => [rowKey(it), { quantity: it.quantity, included: it.included }])
      )
    );

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Price</TableHead>
            <TableHead className="w-[180px] text-center">Qty</TableHead>
            <TableHead className="text-right">Subtotal</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it) => {
            const key = rowKey(it);
            const r = state[key] ?? { quantity: it.quantity, included: it.included };
            const muted = !r.included;
            return (
              <TableRow key={key} className={muted ? "opacity-50" : undefined}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={r.included}
                    onChange={(e) => setIncluded(key, e.target.checked)}
                    disabled={pending}
                    aria-label={`Ship ${it.name}`}
                    className="h-4 w-4 rounded border-input"
                  />
                </TableCell>
                <TableCell className={`font-medium ${muted ? "line-through" : ""}`}>
                  {it.name}
                  {it.variantLabel && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{it.variantLabel}</span>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(it.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Decrease"
                      disabled={pending || !r.included || r.quantity <= 1}
                      onClick={() => setQty(key, r.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <Input
                      type="number"
                      min={1}
                      value={r.quantity}
                      onChange={(e) => setQty(key, Number(e.target.value))}
                      disabled={pending || !r.included}
                      className="h-8 w-16 text-center"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      aria-label="Increase"
                      disabled={pending || !r.included}
                      onClick={() => setQty(key, r.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {r.included ? formatCurrency(it.price * r.quantity) : "—"}
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="font-semibold">
            <TableCell colSpan={3} />
            <TableCell className="text-right">Total</TableCell>
            <TableCell className="text-right">{formatCurrency(currentTotal)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {dirty && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t bg-muted/30 px-4 py-3 text-sm">
          <span className="mr-auto text-muted-foreground">
            New bill total {formatCurrency(currentTotal)} (was {formatCurrency(originalTotal)})
          </span>
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={onReset}>
            <Undo2 className="h-4 w-4" /> Reset
          </Button>
          <Button
            type="button"
            variant="brand"
            size="sm"
            disabled={pending || allUnchecked}
            onClick={onSave}
          >
            <Save className="h-4 w-4" />
            {pending ? "Saving..." : "Save changes"}
          </Button>
        </div>
      )}
    </>
  );
}
