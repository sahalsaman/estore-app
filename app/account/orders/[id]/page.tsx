import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getBuyerProfile, getBuyerOrderDetail } from "@/services/buyer-portal";
import { ReturnDialog } from "./return-dialog";

const RETURN_STATUS_VARIANT = {
  requested: "warning",
  approved: "success",
  rejected: "secondary",
} as const;

export default async function BuyerOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("buyer");
  const profile = await getBuyerProfile(session.userId);
  const order = await getBuyerOrderDetail(profile?.phone ?? "", id);
  if (!order) notFound();

  return (
    <div>
      <PageHeader
        title={`Order #${order.id.slice(-6)}`}
        description={`${order.sellerName} · ${formatDate(order.createdAt)}`}
        action={
          <div className="flex items-center gap-2">
            {order.returnable && (
              <ReturnDialog
                orderId={order.id}
                items={order.items.map((it) => ({
                  productId: it.productId,
                  variantId: it.variantId,
                  name: it.name,
                  variantLabel: it.variantLabel,
                  price: it.price,
                  returnableQuantity: it.returnableQuantity,
                }))}
              />
            )}
            <Button variant="ghost" asChild>
              <Link href="/account/orders"><ArrowLeft className="h-4 w-4" /> Back to orders</Link>
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <Badge variant="secondary" className="capitalize">Order: {order.orderStatus}</Badge>
        <Badge variant="secondary" className="capitalize">Payment: {order.paymentStatus}</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Items</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items.map((it) => (
                <TableRow key={`${it.productId}|${it.variantId ?? ""}`}>
                  <TableCell className="font-medium">
                    {it.name}
                    {it.variantLabel ? <span className="text-muted-foreground"> · {it.variantLabel}</span> : null}
                    {it.returnedQuantity > 0 && (
                      <span className="ml-2 text-xs text-muted-foreground">({it.returnedQuantity} returned)</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(it.price)}</TableCell>
                  <TableCell className="text-right">{it.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(it.subtotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <span className="text-sm text-muted-foreground">{order.totalQuantity} items</span>
            <span className="text-lg font-semibold">{formatCurrency(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      {order.returns.length > 0 && (
        <Card className="mt-6">
          <CardHeader><CardTitle>Returns for this order</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{formatDate(r.createdAt)}</TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.items.map((it) => `${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} ×${it.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell><Badge variant={RETURN_STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge></TableCell>
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
