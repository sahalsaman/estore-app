import { notFound } from "next/navigation";
import mongoose from "mongoose";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { formatCurrency, formatDate } from "@/lib/utils";
import { listProducts } from "@/services/products";
import { ToggleVendorButton } from "./toggle-button";

export default async function VendorDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();
  await connectDB();
  const business = await Business.findOne({ _id: id, role: "seller" })
    .populate({ path: "ownerId", model: User, select: "name email phone" })
    .lean();
  if (!business) notFound();

  const user = business.ownerId as unknown as { name: string; email: string; phone?: string };
  const products = (await listProducts(business._id)).slice(0, 20);

  return (
    <div>
      <PageHeader
        title={business?.name}
        description={`Owned by ${user?.name}`}
        action={<ToggleVendorButton businessId={id} status={business.status} />}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Owner</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span>{user?.name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span><span>{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Phone</span><span>{user?.phone || "—"}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Business</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Address</span><span>{business?.address || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Status</span><Badge variant={business.status === "active" ? "success" : "warning"}>{business.status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Joined</span><span>{formatDate(business.createdAt)}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader><CardTitle>Products ({products.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          {products.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">No products yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{formatCurrency(p.price)}</TableCell>
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
  );
}
