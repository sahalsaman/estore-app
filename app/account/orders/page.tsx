import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getBuyerProfile, listBuyerOrders } from "@/services/buyer-portal";

export default async function BuyerOrdersPage() {
  const session = await requireRole("buyer");
  const profile = await getBuyerProfile(session.userId);
  const orders = await listBuyerOrders(profile?.phone ?? "");

  return (
    <div>
      <PageHeader title="My orders" description="Every order you've placed, across all sellers." />
      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="No orders yet"
          description="Browse a store and place your first order."
          action={
            <Link href="/store" className="text-sm text-brand hover:underline">
              Browse stores
            </Link>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell>
                      <Link href={`/account/orders/${o.id}`} className="text-brand hover:underline">
                        <code className="text-xs">{o.id.slice(-6)}</code>
                      </Link>
                    </TableCell>
                    <TableCell className="font-medium">{o.sellerName}</TableCell>
                    <TableCell className="max-w-xs truncate">{o.productSummary}</TableCell>
                    <TableCell className="text-right">{formatCurrency(o.totalAmount)}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{o.orderStatus}</Badge></TableCell>
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
