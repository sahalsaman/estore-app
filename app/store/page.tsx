import Link from "next/link";
import { Store } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { Business } from "@/models/Business";

type StoreCard = {
  slug: string;
  businessName: string;
  address?: string;
};

async function getStores(): Promise<StoreCard[]> {
  await connectDB();
  const vendors = await Vendor.find({ status: "active" })
    .populate({ path: "businessId", model: Business, select: "name address slug" })
    .lean();
  const result: StoreCard[] = [];
  for (const v of vendors) {
    const business = v.businessId as unknown as { name: string; address?: string; slug?: string } | null;
    if (!business?.slug) continue;
    result.push({
      slug: business.slug,
      businessName: business.name ?? "Unnamed store",
      address: business.address,
    });
  }
  return result;
}

export const metadata = { title: "Browse stores — order.store" };

export default async function StoresListPage() {
  const stores = await getStores();
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-semibold">order.store</span>
          </Link>
          <Button variant="outline" asChild>
            <Link href="/login">Seller sign in</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <PageHeader title="Stores" description="Browse sellers and order directly. No signup required." />
        {stores.length === 0 ? (
          <EmptyState
            icon={<Store className="h-8 w-8" />}
            title="No stores open yet"
            description="Check back soon — sellers are signing up."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((s) => (
              <Link key={s.slug} href={`/store/${s.slug}`} className="group">
                <Card className="h-full transition-shadow group-hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand">
                      <Store className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold">{s.businessName}</h3>
                    {s.address && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{s.address}</p>}
                    <div className="mt-3">
                      <code className="text-xs text-muted-foreground">/{s.slug}</code>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t bg-background py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} order.store
      </footer>
    </div>
  );
}
