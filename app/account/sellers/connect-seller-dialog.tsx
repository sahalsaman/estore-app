"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Search, Store, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  searchSellersAction,
  connectSellerAction,
  type SellerSearchResult,
} from "@/actions/buyer-sellers";

export function ConnectSellerDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SellerSearchResult[]>([]);
  const [searching, startSearch] = useTransition();
  const [connectingId, setConnectingId] = useState<string | null>(null);

  // Debounced live search. All state writes happen inside the timeout callback
  // (not synchronously in the effect body).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const t = setTimeout(() => {
      if (q.length < 1) {
        setResults([]);
        return;
      }
      startSearch(async () => {
        const res = await searchSellersAction(q);
        setResults(res);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query, open]);

  const onConnect = (s: SellerSearchResult) => {
    setConnectingId(s.businessId);
    startSearch(async () => {
      const res = await connectSellerAction(s.businessId);
      if (res.ok) {
        toast.success(res.message);
        setResults((prev) => prev.map((r) => (r.businessId === s.businessId ? { ...r, connected: true } : r)));
        router.refresh();
      } else {
        toast.error(res.message);
      }
      setConnectingId(null);
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(n) => {
        setOpen(n);
        if (!n) {
          setQuery("");
          setResults([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="brand">
          <Plus className="h-4 w-4" /> Connect new seller
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Connect a seller</DialogTitle>
          <DialogDescription>
            Search for a store by name and connect to start ordering and tracking your balance with them.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search store name…"
              className="h-10 pl-9"
            />
          </div>

          <div className="min-h-[8rem] divide-y rounded-md border">
            {query.trim().length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Start typing to find sellers.</p>
            ) : searching && results.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Searching…</p>
            ) : results.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No stores match &ldquo;{query}&rdquo;.</p>
            ) : (
              results.map((s) => (
                <div key={s.businessId} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-brand/10 text-brand">
                    <Store className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{s.name}</p>
                    {s.slug && <p className="truncate text-xs text-muted-foreground">/{s.slug}</p>}
                  </div>
                  {s.connected ? (
                    <Badge variant="success" className="shrink-0">
                      <Check className="h-3 w-3" /> Connected
                    </Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={connectingId === s.businessId}
                      onClick={() => onConnect(s)}
                    >
                      {connectingId === s.businessId ? "Connecting…" : "Connect"}
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
