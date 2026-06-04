import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSearch } from "@/components/shared/list-search";
import { ShoppingCart } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { listOrders, listVendorBuyers } from "@/services/orders";
import { listProducts } from "@/services/products";
import { AddOrderDialog, type BuyerOption, type ProductOption } from "./add-order-dialog";

export default async function VendorOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).select("_id").lean();
  const [all, vendorBuyers, products] = vendor
    ? await Promise.all([
        listOrders(vendor._id),
        listVendorBuyers(vendor._id),
        listProducts(vendor._id),
      ])
    : [[], [], []];

  const buyerOptions: BuyerOption[] = vendorBuyers.map((b) => ({ name: b.name, phone: b.phone }));
  const productOptions: ProductOption[] = products
    .filter((p) => p.status === "active")
    .map((p) => ({
      id: p.id,
      name: p.name,
      wholesalePrice: p.wholesalePrice,
      stock: p.stock,
      hasVariants: p.hasVariants,
      variants: p.variants.map((v) => ({
        id: v.id,
        label: v.label,
        wholesalePrice: v.wholesalePrice,
        stock: v.stock,
        status: v.status,
      })),
    }));

  const { q } = await searchParams;
  const needle = (q ?? "").trim().toLowerCase();
  const orders = needle
    ? all.filter(
        (o) =>
          o.id.toLowerCase().includes(needle) ||
          o.buyerName.toLowerCase().includes(needle) ||
          (o.buyerPhone ?? "").toLowerCase().includes(needle) ||
          o.productSummary.toLowerCase().includes(needle)
      )
    : all;

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every order placed at your store."
        action={<AddOrderDialog buyers={buyerOptions} products={productOptions} />}
      />

      <div className="mb-4">
        <ListSearch action="/business/orders" q={q} placeholder="Search by buyer, phone, item, or order ID" />
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="No orders yet"
          description="Share your store link or record an offline order."
          action={<AddOrderDialog buyers={buyerOptions} products={productOptions} />}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="No matches"
          description={`Nothing matches "${q}".`}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/business/orders/${o.id}`} className="text-brand hover:underline">
                        <code className="text-xs">{o.id.slice(-6)}</code>
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{o.buyerName}</TableCell>
                    <TableCell>{o.buyerPhone || "—"}</TableCell>
                    <TableCell className="max-w-xs truncate">{o.productSummary}</TableCell>
                    <TableCell>{formatCurrency(o.totalAmount)}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{o.orderStatus}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Link href={`/business/orders/${o.id}`} className="text-sm text-brand hover:underline">
                        View
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
