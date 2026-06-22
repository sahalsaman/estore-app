import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getBuyerProfile, listBuyerReturns } from "@/services/buyer-portal";

const STATUS_VARIANT = {
  requested: "warning",
  approved: "success",
  rejected: "secondary",
} as const;

export default async function BuyerReturnsPage() {
  const session = await requireRole("buyer");
  const profile = await getBuyerProfile(session.userId);
  const returns = await listBuyerReturns(profile?.phone ?? "");

  return (
    <div>
      <PageHeader title="Returns" description="Return requests you've raised and their status." />
      {returns.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-8 w-8" />}
          title="No returns yet"
          description="You can request a return from any eligible order's detail page."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="font-medium">{r.sellerName}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.items.map((it) => `${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} ×${it.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge></TableCell>
                    <TableCell>
                      <Link href={`/account/orders/${r.orderId}`} className="text-sm text-brand hover:underline">
                        <code className="text-xs">{r.orderId.slice(-6)}</code>
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
