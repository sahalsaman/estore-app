import Link from "next/link";
import { ShoppingCart, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCartForVendor } from "@/actions/orders";
import { resolveStoreBySlug } from "@/lib/store-resolver";

export default async function VendorStoreLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await resolveStoreBySlug(slug);
  const cart = await getCartForVendor(store.vendorId);
  const count = cart.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link href={`/store/${slug}`} className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-brand/10 text-brand">
              {store.business.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={store.business.logo}
                  alt={`${store.name} logo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Store className="h-5 w-5" />
              )}
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">{store.name}</h1>
              {store.address && <p className="text-xs text-muted-foreground">{store.address}</p>}
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {/* <Button variant="ghost" size="sm" asChild>
              <Link href="/store">
                <ArrowLeft className="h-3.5 w-3.5" /> All stores
              </Link>
            </Button> */}
            <Button variant="brand" size="sm" asChild className="relative">
              <Link href={`/store/${slug}/cart`}>
                <ShoppingCart className="h-4 w-4" />
                Cart
                {count > 0 && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-brand">
                    {count}
                  </span>
                )}
              </Link>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
      <footer className="border-t bg-background py-4 text-center text-xs text-muted-foreground">
        Powered by order.store
      </footer>
    </div>
  );
}
