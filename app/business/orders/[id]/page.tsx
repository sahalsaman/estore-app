import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getOrderDetail } from "@/services/orders";
import { getInvoiceForOrder } from "@/services/invoices";
import { OrderStatusForm } from "./status-form";
import { OrderItemsEditor } from "./items-editor";
import { MarkAsPackedButton } from "./generate-invoice-button";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).select("_id").lean();
  if (!vendor) notFound();
  const [order, invoice] = await Promise.all([
    getOrderDetail(vendor._id, id),
    getInvoiceForOrder(vendor._id, id),
  ]);
  if (!order) notFound();

  const buyerHref = order.buyerPhone ? `/business/buyers/${encodeURIComponent(order.buyerPhone)}` : null;
  const isInvoiced = !!invoice;

  return (
    <div>
      <PageHeader
        title={`Order ${order.id.slice(-6)}`}
        description={formatDate(order.createdAt)}
        action={
          <Button variant="ghost" asChild>
            <Link href="/business/orders"><ArrowLeft className="h-4 w-4" /> Back to orders</Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Items</CardTitle>
            <p className="text-sm text-muted-foreground">
              {isInvoiced
                ? `Locked — invoice ${invoice.invoiceNumber} has been generated.`
                : "Untick items you're not shipping, adjust quantities, then click Mark as packed."}
            </p>
          </CardHeader>
          <CardContent className="p-0">
            {isInvoiced ? (
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
                  {invoice.items.map((it) => (
                    <TableRow key={`${it.productId}|${it.variantId ?? ""}`}>
                      <TableCell className="font-medium">
                        {it.name}
                        {it.variantLabel && (
                          <span className="ml-2 text-xs text-muted-foreground">{it.variantLabel}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(it.price)}</TableCell>
                      <TableCell className="text-right">{it.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(it.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell colSpan={2} />
                    <TableCell className="text-right">Total</TableCell>
                    <TableCell className="text-right">{formatCurrency(invoice.totalAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            ) : (
              <OrderItemsEditor
                orderId={order.id}
                items={order.items.map((it) => ({
                  productId: it.productId,
                  variantId: it.variantId,
                  variantLabel: it.variantLabel,
                  name: it.name,
                  price: it.price,
                  quantity: it.quantity,
                  included: it.included,
                }))}
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Buyer</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{order.buyerName}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{order.buyerPhone || "—"}</span></div>
              {buyerHref && (
                <Button variant="outline" size="sm" asChild className="mt-2 w-full">
                  <Link href={buyerHref}>View buyer history</Link>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Order ID</span><code className="text-xs">{order.id}</code></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Items</span><span>{order.totalQuantity}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatCurrency(order.totalAmount)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Order</span><Badge variant="secondary" className="capitalize">{order.orderStatus}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><Badge variant={order.paymentStatus === "paid" ? "success" : order.paymentStatus === "failed" ? "destructive" : "warning"} className="capitalize">{order.paymentStatus}</Badge></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Invoice & packing</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Marking the order as packed locks the items, generates an invoice for the ticked items, and records a Cash payment collection for the bill amount.
            </p>
          </div>
          {!isInvoiced && <MarkAsPackedButton orderId={order.id} />}
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {isInvoiced ? (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice number</span>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <FileText className="h-4 w-4" />
                  {invoice.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issued</span>
                <span>{formatDate(invoice.issuedAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Bill amount</span>
                <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              {invoice.paymentCollectionId && (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <span className="text-muted-foreground">Payment collection</span>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/business/collections/${invoice.paymentCollectionId}`}>
                      <Wallet className="h-4 w-4" /> Open collection
                    </Link>
                  </Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">
              No invoice yet. Tick the items you&apos;re shipping (untick anything that&apos;s out of stock or not going), then click <strong>Mark as packed</strong>.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Update status</CardTitle></CardHeader>
        <CardContent>
          <OrderStatusForm
            orderId={order.id}
            paymentStatus={order.paymentStatus}
            orderStatus={order.orderStatus}
          />
        </CardContent>
      </Card>
    </div>
  );
}
