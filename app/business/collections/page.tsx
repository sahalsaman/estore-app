import Link from "next/link";
import { Wallet } from "lucide-react";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { listPaymentCollections } from "@/services/payment-collections";
import { listVendorBuyers } from "@/services/orders";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { AddCollectionDialog } from "./add-collection-dialog";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export default async function CollectionsIndexPage() {
  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  const [collections, vendorBuyers] = businessId
    ? await Promise.all([listPaymentCollections(businessId), listVendorBuyers(businessId)])
    : [[], []];
  const buyerOptions = vendorBuyers.map((b) => ({ name: b.name, phone: b.phone }));
  const total = collections.reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <PageHeader
        title="Payment Collections"
        description={
          collections.length > 0
            ? `${collections.length} entries · ${formatCurrency(total)} received`
            : "Payments received from buyers."
        }
        action={<AddCollectionDialog buyers={buyerOptions} />}
      />

      {collections.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No payment collections yet"
          description="Record your first payment received from a buyer."
          action={<AddCollectionDialog buyers={buyerOptions} />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {collections.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{formatDate(c.collectedAt)}</TableCell>
                    <TableCell className="font-medium">
                      <Link
                        href={`/business/collections/${c.id}`}
                        className="hover:text-brand hover:underline"
                      >
                        {c.buyerName}
                      </Link>
                    </TableCell>
                    <TableCell>{c.buyerPhone || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{METHOD_LABEL[c.method] ?? c.method}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[160px] truncate">{c.reference || "—"}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(c.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/business/collections/${c.id}`}
                        className="text-sm text-brand hover:underline"
                      >
                        View
                      </Link>
                    </TableCell>
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
