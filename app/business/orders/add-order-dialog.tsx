"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { createManualOrderAction } from "@/actions/orders";

export type BuyerOption = { name: string; phone: string };
export type ProductVariantOption = {
  id: string;
  label: string;
  wholesalePrice: number;
  stock: number;
  status: "active" | "inactive";
};
export type ProductOption = {
  id: string;
  name: string;
  wholesalePrice: number;
  stock: number;
  hasVariants: boolean;
  variants: ProductVariantOption[];
};

// A selectable line: a plain product, or a single variant of one.
type Row = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  wholesalePrice: number;
  stock: number;
};

type Selection = { productId: string; variantId: string | null; quantity: number };

export function AddOrderDialog({
  buyers,
  products,
  defaultBuyerPhone,
  trigger,
}: {
  buyers: BuyerOption[];
  products: ProductOption[];
  defaultBuyerPhone?: string;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [buyerPhone, setBuyerPhone] = useState(defaultBuyerPhone ?? "");
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [q, setQ] = useState("");

  // Flatten products into selectable rows — one per active variant, or one per
  // plain product.
  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    for (const p of products) {
      if (p.hasVariants) {
        for (const v of p.variants) {
          if (v.status !== "active") continue;
          out.push({
            key: `${p.id}|${v.id}`,
            productId: p.id,
            variantId: v.id,
            name: `${p.name} — ${v.label}`,
            wholesalePrice: v.wholesalePrice,
            stock: v.stock,
          });
        }
      } else {
        out.push({
          key: `${p.id}|`,
          productId: p.id,
          variantId: null,
          name: p.name,
          wholesalePrice: p.wholesalePrice,
          stock: p.stock,
        });
      }
    }
    return out;
  }, [products]);

  const rowByKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);

  const needle = q.trim().toLowerCase();
  const filtered = needle ? rows.filter((r) => r.name.toLowerCase().includes(needle)) : rows;

  const total = Object.entries(selected).reduce((sum, [key, sel]) => {
    const r = rowByKey.get(key);
    return r ? sum + r.wholesalePrice * sel.quantity : sum;
  }, 0);
  const selectedCount = Object.keys(selected).length;

  const reset = () => {
    setBuyerPhone(defaultBuyerPhone ?? "");
    setSelected({});
    setQ("");
  };

  const toggle = (r: Row) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[r.key]) {
        delete next[r.key];
      } else {
        next[r.key] = { productId: r.productId, variantId: r.variantId, quantity: 1 };
      }
      return next;
    });
  };

  const setQty = (r: Row, value: number) => {
    const clamped = Math.max(1, Math.min(r.stock, Math.floor(value || 1)));
    setSelected((prev) => ({
      ...prev,
      [r.key]: { productId: r.productId, variantId: r.variantId, quantity: clamped },
    }));
  };

  const onSubmit = () => {
    if (!buyerPhone) {
      toast.error("Pick a buyer");
      return;
    }
    const items = Object.values(selected).map((sel) => ({
      productId: sel.productId,
      variantId: sel.variantId,
      quantity: sel.quantity,
    }));
    if (items.length === 0) {
      toast.error("Select at least one product");
      return;
    }
    start(async () => {
      const res = await createManualOrderAction({ buyerPhone, items });
      if (res.ok) {
        toast.success("Order created");
        setOpen(false);
        reset();
        router.refresh();
      } else {
        toast.error(res.message);
      }
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="brand">
            <Plus className="h-4 w-4" /> Add order
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add order</DialogTitle>
          <DialogDescription>
            Pick a buyer, tick the products they ordered, set quantities, then click Update.
          </DialogDescription>
        </DialogHeader>

        {buyers.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="font-medium">No buyers yet.</p>
            <p className="text-muted-foreground">
              Invite a buyer first — manual orders can only be recorded for an existing buyer.
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-md border bg-muted/30 p-4 text-sm">
            <p className="font-medium">No products yet.</p>
            <p className="text-muted-foreground">Add at least one product before recording an order.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="buyer">Buyer</Label>
              <select
                id="buyer"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                disabled={pending}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Select a buyer…</option>
                {buyers.map((b) => (
                  <option key={b.phone} value={b.phone}>
                    {b.name} · {b.phone}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Products</Label>
                <span className="text-xs text-muted-foreground">
                  {selectedCount} selected
                </span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products"
                  className="h-9 pl-9"
                  disabled={pending}
                />
              </div>
              <div className="max-h-72 divide-y overflow-y-auto rounded-md border">
                {filtered.length === 0 ? (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No products match &ldquo;{q}&rdquo;.
                  </p>
                ) : (
                  filtered.map((r) => {
                    const sel = selected[r.key];
                    const isChecked = !!sel;
                    const outOfStock = r.stock <= 0;
                    return (
                      <label
                        key={r.key}
                        className={`flex items-center gap-3 px-3 py-2 ${
                          outOfStock ? "opacity-60" : "cursor-pointer hover:bg-muted/40"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={isChecked}
                          disabled={outOfStock || pending}
                          onChange={() => toggle(r)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">{r.name}</p>
                            {outOfStock && (
                              <Badge variant="warning" className="shrink-0 text-[10px]">
                                Out of stock
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(r.wholesalePrice)}
                            {!outOfStock && <> · {r.stock} in stock</>}
                          </p>
                        </div>
                        {isChecked && (
                          <Input
                            type="number"
                            min={1}
                            max={r.stock}
                            value={sel.quantity}
                            onChange={(e) => setQty(r, Number(e.target.value))}
                            disabled={pending}
                            onClick={(e) => e.preventDefault()}
                            className="h-8 w-20 text-center"
                          />
                        )}
                        {isChecked && (
                          <span className="w-20 text-right text-sm font-semibold tabular-nums">
                            {formatCurrency(r.wholesalePrice * sel.quantity)}
                          </span>
                        )}
                      </label>
                    );
                  })
                )}
              </div>
            </div>

            <div className="flex items-center justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="text-lg font-semibold">{formatCurrency(total)}</span>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="brand"
                onClick={onSubmit}
                disabled={pending || !buyerPhone || selectedCount === 0}
              >
                {pending ? "Updating..." : "Update"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
