import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { connectDB } from "@/lib/db";
import { Buyer } from "@/models/Buyer";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { Vendor } from "@/models/Vendor";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Order } from "@/models/Order";

export default async function BuyerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const buyer = await Buyer.findById(id).populate({ path: "userId", model: User, select: "name phone email" }).lean();
  if (!buyer) notFound();
  const u = buyer.userId as unknown as { name: string; phone?: string; email?: string };

  const orders = u?.phone
    ? await Order.find({ buyerPhone: u.phone })
        .sort({ createdAt: -1 })
        .populate({
          path: "vendorId",
          model: Vendor,
          select: "businessId",
          populate: { path: "businessId", model: Business, select: "name" },
        })
        .lean()
    : [];

  const rows = orders.map((o) => {
    const vendor = o.vendorId as unknown as { businessId?: { name?: string } } | null;
    const businessName = vendor?.businessId?.name ?? "—";
    const summary = o.items.map((it) => `${it.name} ×${it.quantity}`).join(", ");
    return {
      date: o.createdAt.toISOString(),
      vendor: businessName,
      total: o.totalAmount,
      status: o.orderStatus,
      summary,
    };
  });

  return (
    <div>
      <PageHeader title={u?.name} description={u?.phone || u?.email} />
      <Card>
        <CardHeader><CardTitle>Order history</CardTitle></CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Store</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.date}-${i}`}>
                    <TableCell>{formatDate(r.date)}</TableCell>
                    <TableCell>{r.vendor}</TableCell>
                    <TableCell className="max-w-xs truncate">{r.summary}</TableCell>
                    <TableCell>{formatCurrency(r.total)}</TableCell>
                    <TableCell><Badge variant="secondary">{r.status}</Badge></TableCell>
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
