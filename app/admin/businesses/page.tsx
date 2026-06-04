import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Building2 } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { Vendor } from "@/models/Vendor";
import { formatDate } from "@/lib/utils";

async function getBusinesses() {
  await connectDB();
  const businesses = await Business.find().sort({ createdAt: -1 }).lean();
  const result = await Promise.all(
    businesses.map(async (b) => ({
      ...b,
      _id: b._id.toString(),
      ownerId: b.ownerId.toString(),
      vendorCount: await Vendor.countDocuments({ businessId: b._id }),
    }))
  );
  return result;
}

export default async function BusinessesPage() {
  const businesses = await getBusinesses();
  return (
    <div>
      <PageHeader title="Businesses" description="All seller businesses on the platform." />
      {businesses.length === 0 ? (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="No businesses yet" description="Businesses will appear here once vendors sign up." />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Vendors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {businesses.map((b) => (
                <TableRow key={b._id}>
                  <TableCell className="font-medium">{b.name}</TableCell>
                  <TableCell>{b.phone || "—"}</TableCell>
                  <TableCell>{b.vendorCount}</TableCell>
                  <TableCell>
                    <Badge variant={b.status === "active" ? "success" : "warning"}>{b.status}</Badge>
                  </TableCell>
                  <TableCell>{formatDate(b.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/businesses/${b._id}`} className="text-sm text-brand hover:underline">
                      View
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
