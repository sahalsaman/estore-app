import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { resolveStoreBySlug } from "@/lib/store-resolver";
import { listProducts } from "@/services/products";
import { StoreProductCard } from "./store-product-card";

type Search = { q?: string; category?: string };

export default async function VendorStorePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}) {
  const { slug } = await params;
  const store = await resolveStoreBySlug(slug);
  const sp = await searchParams;
  const all = await listProducts(store.businessId);
  const active = all.filter((p) => p.status === "active");
  const categories = Array.from(new Set(active.map((p) => p.category))).sort();
  const q = (sp.q ?? "").trim().toLowerCase();
  const products = active.filter((p) => {
    if (sp.category && p.category !== sp.category) return false;
    if (q && !p.name.toLowerCase().includes(q)) return false;
    return true;
  });

  return (
    <div>
      <Card className="mb-6">
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 sm:flex-row" action={`/store/${slug}`}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input name="q" defaultValue={sp.q} placeholder="Search products" className="pl-9" />
            </div>
            <select
              name="category"
              defaultValue={sp.category ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <Button type="submit" variant="brand">Filter</Button>
          </form>
        </CardContent>
      </Card>

      {products.length === 0 ? (
        <EmptyState title="No products yet" description="This store hasn't added any items yet." />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <StoreProductCard key={p.id} slug={slug} businessId={store.businessId} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
