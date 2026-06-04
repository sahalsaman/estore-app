import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { formatDate } from "@/lib/utils";

async function getVendors() {
  await connectDB();
  const vendors = await Vendor.find()
    .populate({ path: "userId", model: User, select: "name email" })
    .populate({ path: "businessId", model: Business, select: "name" })
    .sort({ createdAt: -1 })
    .lean();
  return vendors;
}

export default async function VendorsPage() {
  const vendors = await getVendors();
  return (
    <div>
      <PageHeader title="Vendors" description="Sellers active on order.store." />
      {vendors.length === 0 ? (
        <EmptyState icon={<ShoppingBag className="h-8 w-8" />} title="No vendors yet" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Business</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {vendors.map((v) => {
                const user = v.userId as unknown as { name: string; email: string };
                const business = v.businessId as unknown as { name: string };
                return (
                  <TableRow key={v._id.toString()}>
                    <TableCell className="font-medium">{user?.name}</TableCell>
                    <TableCell>{business?.name}</TableCell>
                    <TableCell>{user?.email}</TableCell>
                    <TableCell>
                      <Badge variant={v.status === "active" ? "success" : "warning"}>{v.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(v.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/vendors/${v._id.toString()}`} className="text-sm text-brand hover:underline">
                        Manage
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
