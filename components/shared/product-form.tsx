"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ProductFormState } from "@/actions/products";

type Action = (state: ProductFormState, fd: FormData) => Promise<ProductFormState>;

type VariantInitial = {
  options: { name: string; value: string }[];
  price: number;
  wholesalePrice: number;
  stock: number;
  status: "active" | "inactive";
};

export type ProductFormInitial = {
  name?: string;
  description?: string;
  price?: number;
  wholesalePrice?: number;
  stock?: number;
  category?: string;
  status?: "active" | "inactive";
  images?: string[];
  hasVariants?: boolean;
  optionNames?: string[];
  variants?: VariantInitial[];
};

type Cell = { price: string; wholesalePrice: string; stock: string; active: boolean };

function splitValues(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[,\n]/).map((s) => s.trim()).filter(Boolean)) {
    if (!seen.has(part.toLowerCase())) {
      seen.add(part.toLowerCase());
      out.push(part);
    }
  }
  return out;
}

function comboKey(values: string[]): string {
  return values.join("∕");
}

export function ProductForm({
  action,
  initial,
  submitLabel,
  onSuccess,
}: {
  action: Action;
  initial?: ProductFormInitial;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, undefined);
  const e = state?.fieldErrors;

  useEffect(() => {
    if (state?.ok) onSuccess?.();
  }, [state, onSuccess]);

  // ----- variant builder state -----
  const [hasVariants, setHasVariants] = useState(initial?.hasVariants ?? false);
  const [name1, setName1] = useState(initial?.optionNames?.[0] ?? "");
  const [name2, setName2] = useState(initial?.optionNames?.[1] ?? "");

  const initialVals = useMemo(() => {
    const v1 = new Set<string>();
    const v2 = new Set<string>();
    for (const v of initial?.variants ?? []) {
      if (v.options[0]?.value) v1.add(v.options[0].value);
      if (v.options[1]?.value) v2.add(v.options[1].value);
    }
    return { v1: Array.from(v1).join(", "), v2: Array.from(v2).join(", ") };
  }, [initial]);

  const [vals1, setVals1] = useState(initialVals.v1);
  const [vals2, setVals2] = useState(initialVals.v2);

  // Per-combination price/stock, keyed by the joined option values.
  const [cells, setCells] = useState<Record<string, Cell>>(() => {
    const map: Record<string, Cell> = {};
    for (const v of initial?.variants ?? []) {
      map[comboKey(v.options.map((o) => o.value))] = {
        price: String(v.price),
        wholesalePrice: String(v.wholesalePrice),
        stock: String(v.stock),
        active: v.status !== "inactive",
      };
    }
    return map;
  });

  const values1 = splitValues(vals1);
  const values2 = splitValues(vals2);

  // Cartesian product of the (1 or 2) option dimensions.
  const combos = useMemo<string[][]>(() => {
    if (values1.length === 0) return [];
    if (name2.trim() && values2.length > 0) {
      return values1.flatMap((a) => values2.map((b) => [a, b]));
    }
    return values1.map((a) => [a]);
  }, [vals1, vals2, name2]); // eslint-disable-line react-hooks/exhaustive-deps

  const optionNames = useMemo(() => {
    const names = [name1.trim()];
    if (name2.trim() && values2.length > 0) names.push(name2.trim());
    return names.filter(Boolean);
  }, [name1, name2, vals2]); // eslint-disable-line react-hooks/exhaustive-deps

  const getCell = (key: string): Cell =>
    cells[key] ?? { price: "0", wholesalePrice: "0", stock: "0", active: true };

  const setCell = (key: string, patch: Partial<Cell>) =>
    setCells((prev) => ({ ...prev, [key]: { ...getCell(key), ...patch } }));

  const variantsJson = useMemo(() => {
    const list = combos.map((values) => {
      const cell = getCell(comboKey(values));
      const options = values.map((value, i) => ({ name: optionNames[i] ?? `Option ${i + 1}`, value }));
      return {
        options,
        price: Number(cell.price) || 0,
        wholesalePrice: Number(cell.wholesalePrice) || 0,
        stock: Number(cell.stock) || 0,
        status: cell.active ? "active" : "inactive",
      };
    });
    return JSON.stringify(list);
  }, [combos, cells, optionNames]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Product name</Label>
        <Input id="name" name="name" defaultValue={initial?.name} />
        {e?.name && <p className="text-sm text-destructive">{e.name[0]}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={initial?.description} rows={3} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Input id="category" name="category" defaultValue={initial?.category ?? "General"} />
          {e?.category && <p className="text-sm text-destructive">{e.category[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <select
            id="status"
            name="status"
            defaultValue={initial?.status ?? "active"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Options toggle */}
      <label className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <input
          type="checkbox"
          checked={hasVariants}
          onChange={(ev) => setHasVariants(ev.target.checked)}
          className="h-4 w-4 rounded border-input"
        />
        <span className="font-medium">This product has options</span>
        <span className="text-muted-foreground">— size, color, volume/weight…</span>
      </label>
      <input type="hidden" name="hasVariants" value={hasVariants ? "true" : "false"} />

      {!hasVariants ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="price">MRP</Label>
            <Input id="price" name="price" type="number" step="0.01" defaultValue={initial?.price ?? 0} />
            <p className="text-xs text-muted-foreground">Original / list price, shown struck through.</p>
            {e?.price && <p className="text-sm text-destructive">{e.price[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="wholesalePrice">Selling price</Label>
            <Input id="wholesalePrice" name="wholesalePrice" type="number" step="0.01" defaultValue={initial?.wholesalePrice ?? 0} />
            <p className="text-xs text-muted-foreground">What the buyer actually pays.</p>
            {e?.wholesalePrice && <p className="text-sm text-destructive">{e.wholesalePrice[0]}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="stock">Stock</Label>
            <Input id="stock" name="stock" type="number" defaultValue={initial?.stock ?? 0} />
            {e?.stock && <p className="text-sm text-destructive">{e.stock[0]}</p>}
          </div>
        </div>
      ) : (
        <div className="space-y-4 rounded-md border p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Option 1 name</Label>
              <Input value={name1} onChange={(ev) => setName1(ev.target.value)} placeholder="e.g. Size or Weight" />
              <Input value={vals1} onChange={(ev) => setVals1(ev.target.value)} placeholder="Values, comma separated — 7, 8, 9" />
            </div>
            <div className="space-y-2">
              <Label>Option 2 name <span className="text-muted-foreground">(optional)</span></Label>
              <Input value={name2} onChange={(ev) => setName2(ev.target.value)} placeholder="e.g. Color" />
              <Input value={vals2} onChange={(ev) => setVals2(ev.target.value)} placeholder="Values, comma separated — Red, Blue" />
            </div>
          </div>

          {combos.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Enter an option name and at least one value to generate combinations.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Option</th>
                    <th className="py-2 px-1 font-medium">MRP</th>
                    <th className="py-2 px-1 font-medium">Selling</th>
                    <th className="py-2 px-1 font-medium">Stock</th>
                    <th className="py-2 pl-1 font-medium text-center">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {combos.map((values) => {
                    const key = comboKey(values);
                    const cell = getCell(key);
                    return (
                      <tr key={key} className="border-b last:border-0">
                        <td className="py-1.5 pr-2 font-medium">{values.join(" / ")}</td>
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={cell.price}
                            onChange={(ev) => setCell(key, { price: ev.target.value })}
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            step="0.01"
                            value={cell.wholesalePrice}
                            onChange={(ev) => setCell(key, { wholesalePrice: ev.target.value })}
                            className="h-8 w-24"
                          />
                        </td>
                        <td className="py-1.5 px-1">
                          <Input
                            type="number"
                            value={cell.stock}
                            onChange={(ev) => setCell(key, { stock: ev.target.value })}
                            className="h-8 w-20"
                          />
                        </td>
                        <td className="py-1.5 pl-1 text-center">
                          <input
                            type="checkbox"
                            checked={cell.active}
                            onChange={(ev) => setCell(key, { active: ev.target.checked })}
                            className="h-4 w-4 rounded border-input"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {e?.variantsJson && <p className="text-sm text-destructive">{e.variantsJson[0]}</p>}
          <input type="hidden" name="optionNames" value={JSON.stringify(optionNames)} />
          <input type="hidden" name="variantsJson" value={variantsJson} />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="images">Image URLs</Label>
        <Textarea
          id="images"
          name="images"
          defaultValue={initial?.images?.join("\n")}
          rows={2}
          placeholder="https://...jpg (one per line or comma separated)"
        />
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" variant="brand" disabled={pending}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
