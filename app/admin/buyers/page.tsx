import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { formatDate } from "@/lib/utils";

async function getBuyers() {
  await connectDB();
  return User.find({ role: "buyer" })
    .select("name phone email createdAt")
    .sort({ createdAt: -1 })
    .lean();
}

export default async function BuyersPage() {
  const buyers = await getBuyers();
  return (
    <div>
      <PageHeader title="Buyers" description="Retail buyers placing orders." />
      {buyers.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No buyers yet" />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {buyers.map((u) => (
                <TableRow key={u._id.toString()}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell>{u.phone || "—"}</TableCell>
                  <TableCell>{formatDate(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/admin/buyers/${u._id.toString()}`} className="text-sm text-brand hover:underline">
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
