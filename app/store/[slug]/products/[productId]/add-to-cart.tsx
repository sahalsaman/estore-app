"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addToCartAction, addVariantsToCartAction } from "@/actions/orders";
import { formatCurrency } from "@/lib/utils";

type Variant = {
  id: string;
  label: string;
  wholesalePrice: number;
  stock: number;
  status: "active" | "inactive";
  image?: string;
};

export function AddToCartButton({
  productId,
  businessId,
  hasVariants,
  variants,
  disabled,
}: {
  productId: string;
  businessId: string;
  hasVariants?: boolean;
  variants?: Variant[];
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onResult = (res: { ok: boolean; message?: string; switched?: boolean }) => {
    if (!res.ok) {
      toast.error(res.message ?? "Couldn't add to cart");
      return;
    }
    if (res.switched) toast.info("Switched stores — previous cart cleared");
    else toast.success("Added to cart");
    router.refresh();
  };

  if (hasVariants) {
    return <VariantGrid productId={productId} businessId={businessId} variants={variants ?? []} pending={pending} start={start} onResult={onResult} />;
  }

  return <SimpleAdd productId={productId} businessId={businessId} disabled={disabled} pending={pending} start={start} onResult={onResult} />;
}

type Common = {
  productId: string;
  businessId: string;
  pending: boolean;
  start: (cb: () => Promise<void>) => void;
  onResult: (res: { ok: boolean; message?: string; switched?: boolean }) => void;
};

function SimpleAdd({ productId, businessId, disabled, pending, start, onResult }: Common & { disabled?: boolean }) {
  const [qty, setQty] = useState(1);
  return (
    <div className="flex items-center gap-3">
      <Input
        type="number"
        min={1}
        value={qty}
        onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
        className="w-24"
        disabled={disabled || pending}
      />
      <Button
        variant="brand"
        size="lg"
        disabled={disabled || pending}
        onClick={() => start(async () => onResult(await addToCartAction(productId, businessId, qty)))}
      >
        <ShoppingCart className="h-4 w-4" />
        {pending ? "Adding..." : "Add to cart"}
      </Button>
    </div>
  );
}

function VariantGrid({ productId, businessId, variants, pending, start, onResult }: Common & { variants: Variant[] }) {
  const sellable = variants.filter((v) => v.status === "active");
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const setQty = (id: string, value: number, stock: number) =>
    setQtys((prev) => ({ ...prev, [id]: Math.max(0, Math.min(stock, Math.floor(value || 0))) }));

  const lines = Object.entries(qtys)
    .filter(([, q]) => q > 0)
    .map(([variantId, quantity]) => ({ variantId, quantity }));
  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  const onAddAll = () =>
    start(async () => {
      const res = await addVariantsToCartAction(productId, businessId, lines);
      if (res.ok) setQtys({});
      onResult(res);
    });

  return (
    <div className="space-y-3">
      <div className="divide-y rounded-md border">
        {sellable.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No options available</p>
        ) : (
          sellable.map((v) => {
            const out = v.stock <= 0;
            return (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2">
                {v.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image} alt={v.label} className="h-12 w-12 shrink-0 rounded-md border object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{v.label}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(v.wholesalePrice)} · {out ? "out of stock" : `${v.stock} in stock`}
                  </p>
                </div>
                <Input
                  type="number"
                  min={0}
                  max={v.stock}
                  value={qtys[v.id] || ""}
                  placeholder="0"
                  disabled={out || pending}
                  onChange={(e) => setQty(v.id, Number(e.target.value), v.stock)}
                  className="h-9 w-20 text-center"
                />
              </div>
            );
          })
        )}
      </div>
      <Button variant="brand" size="lg" onClick={onAddAll} disabled={pending || totalUnits === 0}>
        <ShoppingCart className="h-4 w-4" />
        {pending ? "Adding..." : totalUnits > 0 ? `Add ${totalUnits} to cart` : "Add to cart"}
      </Button>
    </div>
  );
}
