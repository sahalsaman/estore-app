import Link from "next/link";
import { ShoppingCart, Store } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/dal";
import { getCart } from "@/actions/orders";
import { getBuyerProfile, getSellerSummary } from "@/services/buyer-portal";
import { AccountCart } from "./account-cart";

export default async function BuyerCartPage() {
  const session = await requireRole("buyer");
  const [cart, profile] = await Promise.all([getCart(), getBuyerProfile(session.userId)]);
  const seller = cart.businessId ? await getSellerSummary(cart.businessId) : null;
  const empty = !cart.businessId || cart.items.length === 0;

  return (
    <div>
      <PageHeader
        title="Your cart"
        description={
          seller && !empty
            ? `Ordering from ${seller.name}`
            : "Items you add from a store appear here, ready to order."
        }
      />
      {empty ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Your cart is empty"
          description="Browse a store and add a few products to start an order."
          action={
            <Button variant="brand" asChild>
              <Link href="/store">Browse stores</Link>
            </Button>
          }
        />
      ) : !seller || !seller.active ? (
        <EmptyState
          icon={<Store className="h-8 w-8" />}
          title="Store unavailable"
          description="The store these items belong to is no longer available."
          action={
            <Button variant="brand" asChild>
              <Link href="/store">Browse stores</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <AccountCart
              items={cart.items}
              sellerName={seller.name}
              sellerSlug={seller.slug}
              defaultAddress={profile?.address ?? ""}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
