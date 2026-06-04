import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Vendor } from "@/models/Vendor";
import { Product } from "@/models/Product";
import { Order } from "@/models/Order";
import { formatDate } from "@/lib/utils";
import mongoose from "mongoose";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const business = await Business.findById(id).lean();
  if (!business) notFound();

  const [vendors, productCount, orderCount] = await Promise.all([
    Vendor.find({ businessId: id }).lean(),
    Product.countDocuments({ businessId: id }),
    Order.countDocuments({ businessId: id }),
  ]);

  return (
    <div>
      <PageHeader title={business.name} description={business.address || "No address on file."} />
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Vendors</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{vendors.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Products</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{productCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{orderCount}</CardContent>
        </Card>
      </div>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{business.phone || "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={business.status === "active" ? "success" : "warning"}>{business.status}</Badge></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Created</span><span>{formatDate(business.createdAt)}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
