import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Users } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Buyer } from "@/models/Buyer";
import { User } from "@/models/User";
import { formatDate } from "@/lib/utils";

async function getBuyers() {
  await connectDB();
  return Buyer.find().populate({ path: "userId", model: User, select: "name phone email" }).sort({ createdAt: -1 }).lean();
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
              {buyers.map((b) => {
                const u = b.userId as unknown as { name: string; phone?: string };
                return (
                  <TableRow key={b._id.toString()}>
                    <TableCell className="font-medium">{u?.name}</TableCell>
                    <TableCell>{u?.phone || "—"}</TableCell>
                    <TableCell>{formatDate(b.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/buyers/${b._id.toString()}`} className="text-sm text-brand hover:underline">
                        View
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
