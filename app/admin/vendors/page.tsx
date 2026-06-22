import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag } from "lucide-react";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { formatDate } from "@/lib/utils";

async function getVendors() {
  await connectDB();
  const businesses = await Business.find({ role: "seller" })
    .populate({ path: "ownerId", model: User, select: "name email" })
    .sort({ createdAt: -1 })
    .lean();
  return businesses;
}

export default async function VendorsPage() {
  const businesses = await getVendors();
  return (
    <div>
      <PageHeader title="Vendors" description="Sellers active on order.store." />
      {businesses.length === 0 ? (
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
              {businesses.map((b) => {
                const owner = b.ownerId as unknown as { name?: string; email?: string };
                return (
                  <TableRow key={b._id.toString()}>
                    <TableCell className="font-medium">{owner?.name}</TableCell>
                    <TableCell>{b.name}</TableCell>
                    <TableCell>{owner?.email}</TableCell>
                    <TableCell>
                      <Badge variant={b.status === "active" ? "success" : "warning"}>{b.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(b.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/vendors/${b._id.toString()}`} className="text-sm text-brand hover:underline">
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
