import Link from "next/link";
import { ShoppingCart, Store, Wallet, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getBuyerProfile, getBuyerStats, listBuyerOrders } from "@/services/buyer-portal";

export default async function BuyerDashboardPage() {
  const session = await requireRole("buyer");
  const profile = await getBuyerProfile(session.userId);
  const phone = profile?.phone ?? "";
  const [stats, orders] = await Promise.all([getBuyerStats(phone), listBuyerOrders(phone)]);
  const recent = orders.slice(0, 8);

  return (
    <div>
      <PageHeader
        title={`Hi, ${profile?.name ?? "there"}`}
        description="Your orders, balances and invoices across every seller."
        action={
          <Button variant="outline" asChild>
            <Link href="/store">Browse stores</Link>
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders" value={stats.orderCount} icon={<ShoppingCart className="h-5 w-5" />} />
        <StatCard label="Sellers" value={stats.sellerCount} accent="emerald" icon={<Store className="h-5 w-5" />} />
        <StatCard label="Total spent" value={formatCurrency(stats.totalSpent)} accent="amber" icon={<TrendingUp className="h-5 w-5" />} />
        <StatCard label="Outstanding" value={formatCurrency(stats.outstanding)} accent={stats.outstanding > 0 ? "rose" : "emerald"} icon={<Wallet className="h-5 w-5" />} />
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Recent orders</CardTitle>
          <Button variant="ghost" size="sm" asChild><Link href="/account/orders">View all</Link></Button>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">
              You haven&apos;t placed any orders yet. <Link href="/store" className="text-brand hover:underline">Browse stores</Link>.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>{formatDate(o.createdAt)}</TableCell>
                    <TableCell className="font-medium">{o.sellerName}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      <Link href={`/account/orders/${o.id}`} className="text-brand hover:underline">
                        {o.productSummary}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(o.totalAmount)}</TableCell>
                    <TableCell><Badge variant="secondary" className="capitalize">{o.orderStatus}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
