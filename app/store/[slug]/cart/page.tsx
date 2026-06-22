import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { getCartForBusiness } from "@/actions/orders";
import { resolveStoreBySlug } from "@/lib/store-resolver";
import { CartCheckout } from "./cart-checkout";

export default async function VendorCartPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const store = await resolveStoreBySlug(slug);
  const cart = await getCartForBusiness(store.businessId);

  return (
    <div>
      <PageHeader title="Your cart" />
      {cart.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Your cart is empty"
          description="Add a few products to start an order."
          action={<Button variant="brand" asChild><Link href={`/store/${slug}`}>Browse products</Link></Button>}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <CartCheckout businessId={store.businessId} items={cart} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
