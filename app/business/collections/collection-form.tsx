"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { CollectionFormState } from "@/actions/payment-collections";
import type { PaymentMethod } from "@/models/PaymentCollection";

type Action = (state: CollectionFormState, fd: FormData) => Promise<CollectionFormState>;

export type BuyerOption = { name: string; phone: string };

export type CollectionFormInitial = {
  buyerName?: string;
  buyerPhone?: string;
  amount?: number;
  method?: PaymentMethod;
  reference?: string;
  notes?: string;
  collectedAt?: string;
};

const METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

function toDateInput(iso?: string): string {
  if (!iso) return new Date().toISOString().slice(0, 10);
  return new Date(iso).toISOString().slice(0, 10);
}

export function CollectionForm({
  action,
  buyers,
  initial,
  defaultBuyerPhone,
  submitLabel,
  onSuccess,
}: {
  action: Action;
  buyers: BuyerOption[];
  initial?: CollectionFormInitial;
  defaultBuyerPhone?: string;
  submitLabel: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState<CollectionFormState, FormData>(
    action,
    undefined
  );
  const e = state?.fieldErrors;

  useEffect(() => {
    if (state?.ok) onSuccess?.();
  }, [state, onSuccess]);

  const initialPhone = initial?.buyerPhone ?? defaultBuyerPhone ?? "";
  const initialName = initial?.buyerName ?? "";

  const options = useMemo<BuyerOption[]>(() => {
    if (initialPhone && initialName && !buyers.some((b) => b.phone === initialPhone)) {
      return [{ name: initialName, phone: initialPhone }, ...buyers];
    }
    return buyers;
  }, [buyers, initialPhone, initialName]);

  const [selectedPhone, setSelectedPhone] = useState(initialPhone);
  const selected = options.find((b) => b.phone === selectedPhone);

  if (buyers.length === 0 && !initial) {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-medium">No buyers yet.</p>
        <p className="text-muted-foreground">
          You can only record a payment from a buyer who has placed at least one order, or
          one you&apos;ve invited.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="buyerPhone">Buyer</Label>
        <select
          id="buyerPhone"
          name="buyerPhone"
          required
          value={selectedPhone}
          onChange={(ev) => setSelectedPhone(ev.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="" disabled>
            Select a buyer…
          </option>
          {options.map((b) => (
            <option key={b.phone} value={b.phone}>
              {b.name} · {b.phone}
            </option>
          ))}
        </select>
        <input type="hidden" name="buyerName" value={selected?.name ?? ""} />
        {(e?.buyerPhone || e?.buyerName) && (
          <p className="text-sm text-destructive">
            {e?.buyerPhone?.[0] ?? e?.buyerName?.[0]}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            min="0"
            defaultValue={initial?.amount}
          />
          {e?.amount && <p className="text-sm text-destructive">{e.amount[0]}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="method">Method</Label>
          <select
            id="method"
            name="method"
            defaultValue={initial?.method ?? "cash"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="collectedAt">Date</Label>
          <Input
            id="collectedAt"
            name="collectedAt"
            type="date"
            defaultValue={toDateInput(initial?.collectedAt)}
          />
          {e?.collectedAt && <p className="text-sm text-destructive">{e.collectedAt[0]}</p>}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="reference">Reference (optional)</Label>
        <Input
          id="reference"
          name="reference"
          defaultValue={initial?.reference}
          placeholder="Cheque no., UPI txn ID, etc."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes} rows={2} />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <Button type="submit" variant="brand" disabled={pending || !selected}>
        {pending ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
