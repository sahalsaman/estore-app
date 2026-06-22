"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { addToCartAction, addVariantsToCartAction } from "@/actions/orders";
import { formatCurrency } from "@/lib/utils";

type Variant = {
  id: string;
  label: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  status: "active" | "inactive";
  image?: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  images: string[];
  hasVariants: boolean;
  variants: Variant[];
};

export function StoreProductCard({
  slug,
  businessId,
  product,
  basePath,
}: {
  slug: string;
  businessId: string;
  product: Product;
  // Where the product-detail link points. Defaults to the public storefront;
  // the buyer module passes `/account/sellers/[slug]` to stay in-account.
  basePath?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const hrefBase = basePath ?? `/store/${slug}`;

  const onResult = (res: { ok: boolean; message?: string; switched?: boolean }) => {
    if (!res.ok) {
      toast.error(res.message ?? "Couldn't add to cart");
      return;
    }
    if (res.switched) toast.info("Switched stores — previous cart cleared");
    else toast.success("Added to cart");
    router.refresh();
  };

  return (
    <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md">
      <Link href={`${hrefBase}/products/${product.id}`} className="group block">
        <div className="aspect-square w-full bg-muted">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No image</div>
          )}
        </div>
        <CardContent className="p-4 pb-2">
          <Badge variant="secondary" className="mb-2">{product.category}</Badge>
          <h3 className="line-clamp-1 font-medium group-hover:text-brand">{product.name}</h3>
          <p className="text-lg font-semibold">
            {product.hasVariants && <span className="text-sm font-normal text-muted-foreground">from </span>}
            {formatCurrency(product.wholesalePrice)}
          </p>
          <div className="mt-1 flex justify-between align-baseline gap-2">
            {product.price > 0 && (
              <span className="text-xs text-muted-foreground">MRP: {formatCurrency(product.price)}</span>
            )}
            <p className="text-xs text-muted-foreground">
              {product.stock <= 0 ? "Out of stock" : `${product.stock} in stock`}
            </p>
          </div>
        </CardContent>
      </Link>

      {product.hasVariants ? (
        <VariantGrid product={product} pending={pending} start={start} businessId={businessId} onResult={onResult} />
      ) : (
        <SimpleAdd product={product} pending={pending} start={start} businessId={businessId} onResult={onResult} />
      )}
    </Card>
  );
}

type AddProps = {
  product: Product;
  businessId: string;
  pending: boolean;
  start: (cb: () => Promise<void>) => void;
  onResult: (res: { ok: boolean; message?: string; switched?: boolean }) => void;
};

function SimpleAdd({ product, businessId, pending, start, onResult }: AddProps) {
  const [qty, setQty] = useState(1);
  const max = Math.max(1, product.stock);
  const outOfStock = product.stock <= 0;

  const onAdd = () =>
    start(async () => onResult(await addToCartAction(product.id, businessId, qty)));

  return (
    <div className="mt-auto flex items-center gap-2 border-t p-3">
      <div className="flex items-center rounded-md border">
        <button
          type="button"
          aria-label="Decrease quantity"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={outOfStock || pending || qty <= 1}
          className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-sm font-medium tabular-nums">{qty}</span>
        <button
          type="button"
          aria-label="Increase quantity"
          onClick={() => setQty((q) => Math.min(max, q + 1))}
          disabled={outOfStock || pending || qty >= max}
          className="flex h-9 w-9 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <Button variant="brand" size="sm" className="flex-1" onClick={onAdd} disabled={outOfStock || pending}>
        <ShoppingCart className="h-4 w-4" />
        {pending ? "Adding..." : outOfStock ? "Sold out" : "Add"}
      </Button>
    </div>
  );
}

function VariantGrid({ product, businessId, pending, start, onResult }: AddProps) {
  const sellable = product.variants.filter((v) => v.status === "active");
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const setQty = (id: string, value: number, stock: number) =>
    setQtys((prev) => ({ ...prev, [id]: Math.max(0, Math.min(stock, Math.floor(value || 0))) }));

  const lines = Object.entries(qtys)
    .filter(([, q]) => q > 0)
    .map(([variantId, quantity]) => ({ variantId, quantity }));
  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  const onAddAll = () =>
    start(async () => {
      const res = await addVariantsToCartAction(product.id, businessId, lines);
      if (res.ok) setQtys({});
      onResult(res);
    });

  return (
    <div className="mt-auto flex flex-col gap-2 border-t p-3">
      <div className="max-h-44 space-y-1 overflow-y-auto pr-1">
        {sellable.length === 0 ? (
          <p className="py-2 text-center text-xs text-muted-foreground">No options available</p>
        ) : (
          sellable.map((v) => {
            const out = v.stock <= 0;
            const q = qtys[v.id] ?? 0;
            return (
              <div key={v.id} className="flex items-center gap-2 text-sm">
                {v.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={v.image} alt={v.label} className="h-9 w-9 shrink-0 rounded border object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{v.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatCurrency(v.wholesalePrice)} · {out ? "out of stock" : `${v.stock} left`}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={v.stock}
                  value={q || ""}
                  placeholder="0"
                  disabled={out || pending}
                  onChange={(ev) => setQty(v.id, Number(ev.target.value), v.stock)}
                  className="h-8 w-16 rounded-md border border-input bg-background px-2 text-center text-sm disabled:opacity-40"
                />
              </div>
            );
          })
        )}
      </div>
      <Button
        variant="brand"
        size="sm"
        className="w-full"
        onClick={onAddAll}
        disabled={pending || totalUnits === 0}
      >
        <ShoppingCart className="h-4 w-4" />
        {pending ? "Adding..." : totalUnits > 0 ? `Add ${totalUnits} to cart` : "Add to cart"}
      </Button>
    </div>
  );
}
