import Link from "next/link";
import { headers } from "next/headers";
import { Package, Users, ShoppingCart, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StoreLinkCard } from "@/components/shared/store-link-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { listProducts } from "@/services/products";
import { listOrders } from "@/services/orders";
import { uniqueBusinessSlug } from "@/lib/slug";
import { AddOrderDialog } from "../orders/add-order-dialog";
import { loadOrderOptions } from "../orders/order-options";

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function VendorDashboard() {
  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  if (!businessId) return <p>Business missing.</p>;
  const business = await Business.findById(businessId);
  if (!business) return <p>Business missing.</p>;
  if (!business.slug) {
    business.slug = await uniqueBusinessSlug(business.name, business._id.toString());
    await business.save();
  }
  const slug = business.slug;

  const [orders, products, origin, orderOptions] = await Promise.all([
    listOrders(businessId),
    listProducts(businessId),
    getOrigin(),
    loadOrderOptions(businessId),
  ]);
  const buyerSet = new Set(orders.map((o) => o.buyerPhone).filter(Boolean));
  const revenue = orders.reduce((s, o) => s + o.totalAmount, 0);
  const recentOrders = orders.slice(0, 8);
  const recentProducts = products.slice(0, 6);
  const storeUrl = slug ? `${origin}/store/${slug}` : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Your store at a glance."
        action={<AddOrderDialog buyers={orderOptions.buyers} products={orderOptions.products} />}
      />

      <div className="mb-6">
        <StoreLinkCard url={storeUrl!} slug={slug} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products" value={products.length} icon={<Package className="h-5 w-5" />} />
        <StatCard label="Buyers" value={buyerSet.size} accent="emerald" icon={<Users className="h-5 w-5" />} />
        <StatCard label="Orders" value={orders.length} accent="amber" icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label="Revenue" value={formatCurrency(revenue)} accent="rose" icon={<TrendingUp className="h-5 w-5" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent orders</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/business/orders">View all</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentOrders.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-medium">{o.buyerName}</TableCell>
                      <TableCell>{formatCurrency(o.totalAmount)}</TableCell>
                      <TableCell><Badge variant="secondary">{o.orderStatus}</Badge></TableCell>
                      <TableCell>{formatDate(o.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Recent products</CardTitle>
            <Button variant="ghost" size="sm" asChild><Link href="/business/products">Manage</Link></Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentProducts.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No products yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{formatCurrency(p.wholesalePrice)}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
