"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Plus, Search, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PaymentCollectionDTO } from "@/services/payment-collections";
import { AddCollectionDialog } from "./add-collection-dialog";
import type { BuyerOption } from "./collection-form";

export function CollectionsSidebar({
  collections,
  buyers,
}: {
  collections: PaymentCollectionDTO[];
  buyers: BuyerOption[];
}) {
  const pathname = usePathname();
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? collections.filter(
        (c) =>
          c.buyerName.toLowerCase().includes(needle) ||
          (c.buyerPhone ?? "").toLowerCase().includes(needle)
      )
    : collections;
  const total = collections.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div>
          <h2 className="text-sm font-semibold">Payment Collections</h2>
          <p className="text-xs text-muted-foreground">
            {collections.length} entries · {formatCurrency(total)}
          </p>
        </div>
        <AddCollectionDialog
          buyers={buyers}
          trigger={
            <Button size="sm" variant="brand">
              <Plus className="h-4 w-4" /> New
            </Button>
          }
        />
      </div>

      <div className="border-b p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search buyer or phone"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <ul className="max-h-[70vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Wallet className="h-6 w-6 text-muted-foreground/60" />
            {collections.length === 0
              ? "No payment collections recorded yet."
              : `No matches for "${q}".`}
          </li>
        ) : (
          filtered.map((c) => {
            const href = `/business/collections/${c.id}`;
            const active = pathname === href;
            return (
              <li key={c.id}>
                <Link
                  href={href}
                  className={`block border-b px-3 py-3 transition-colors hover:bg-muted/50 ${
                    active ? "bg-muted" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{c.buyerName}</span>
                    <span className="shrink-0 text-sm font-semibold">
                      {formatCurrency(c.amount)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                    <span className="truncate">{c.buyerPhone || "—"}</span>
                    <span className="shrink-0 capitalize">
                      {c.method.replace("_", " ")} · {formatDate(c.collectedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
