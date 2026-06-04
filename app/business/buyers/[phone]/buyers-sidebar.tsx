"use client";

import Link from "next/link";
import { useState } from "react";
import { Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export type BuyerSidebarItem = {
  name: string;
  phone: string;
  orders: number;
  total: number;
  invited: boolean;
};

export function BuyersSidebar({
  buyers,
  activePhone,
}: {
  buyers: BuyerSidebarItem[];
  activePhone: string;
}) {
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? buyers.filter(
        (b) =>
          b.name.toLowerCase().includes(needle) ||
          (b.phone ?? "").toLowerCase().includes(needle)
      )
    : buyers;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <div>
          <h2 className="text-sm font-semibold">Buyers</h2>
          <p className="text-xs text-muted-foreground">{buyers.length} total</p>
        </div>
        <Link href="/business/buyers" className="text-xs text-brand hover:underline">
          Full list →
        </Link>
      </div>

      <div className="border-b p-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or phone"
            className="h-9 pl-9"
          />
        </div>
      </div>

      <ul className="max-h-[70vh] overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="flex flex-col items-center gap-2 p-6 text-center text-sm text-muted-foreground">
            <Users className="h-6 w-6 text-muted-foreground/60" />
            {buyers.length === 0 ? "No buyers yet." : `No matches for "${q}".`}
          </li>
        ) : (
          filtered.map((b) => {
            const href = b.phone ? `/business/buyers/${encodeURIComponent(b.phone)}` : null;
            const active = b.phone === activePhone;
            const inner = (
              <div className="block border-b px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{b.name}</span>
                    {b.invited && (
                      <Badge variant="warning" className="shrink-0 text-[10px]">
                        Invited
                      </Badge>
                    )}
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{formatCurrency(b.total)}</span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="truncate">{b.phone || "—"}</span>
                  <span>
                    {b.orders} {b.orders === 1 ? "order" : "orders"}
                  </span>
                </div>
              </div>
            );
            return (
              <li key={b.phone || b.name}>
                {href ? (
                  <Link
                    href={href}
                    className={`block transition-colors hover:bg-muted/50 ${active ? "bg-muted" : ""}`}
                  >
                    {inner}
                  </Link>
                ) : (
                  <div className="opacity-70">{inner}</div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
