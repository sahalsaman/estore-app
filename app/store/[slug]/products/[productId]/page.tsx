import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { resolveStoreBySlug } from "@/lib/store-resolver";
import { getProduct } from "@/services/products";
import { AddToCartButton } from "./add-to-cart";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string; productId: string }>;
}) {
  const { slug, productId } = await params;
  const store = await resolveStoreBySlug(slug);
  const product = await getProduct(store.vendorId, productId);
  if (!product || product.status !== "active") notFound();

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card className="overflow-hidden">
        <div className="aspect-square bg-muted">
          {product.images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">No image</div>
          )}
        </div>
        {product.images.length > 1 && (
          <div className="grid grid-cols-4 gap-2 p-3">
            {product.images.slice(1, 5).map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="aspect-square w-full rounded-md object-cover" />
            ))}
          </div>
        )}
      </Card>
      <div>
        <Badge variant="secondary" className="mb-2">{product.category}</Badge>
        <h1 className="text-3xl font-semibold tracking-tight">{product.name}</h1>
        <div className="mt-4 flex items-baseline gap-3">
          <span className="text-3xl font-semibold text-brand">
            {product.hasVariants && <span className="text-base font-normal text-muted-foreground">from </span>}
            {formatCurrency(product.wholesalePrice)}
          </span>
          {product.price > product.wholesalePrice && (
            <span className="text-sm text-muted-foreground line-through">{formatCurrency(product.price)}</span>
          )}
        </div>
        {!product.hasVariants && (
          <p className="mt-2 text-sm text-muted-foreground">
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </p>
        )}
        <Card className="mt-6">
          <CardContent className="p-6">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.description || "No description provided."}
            </p>
          </CardContent>
        </Card>
        <div className="mt-6">
          <AddToCartButton
            productId={product.id}
            vendorId={store.vendorId}
            hasVariants={product.hasVariants}
            variants={product.variants}
            disabled={!product.hasVariants && product.stock <= 0}
          />
        </div>
      </div>
    </div>
  );
}
