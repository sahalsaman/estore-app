import { FileText } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getBuyerProfile, listBuyerInvoices } from "@/services/buyer-portal";

export default async function BuyerInvoicesPage() {
  const session = await requireRole("buyer");
  const profile = await getBuyerProfile(session.userId);
  const invoices = await listBuyerInvoices(profile?.phone ?? "");
  const total = invoices.reduce((s, i) => s + i.totalAmount, 0);

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={
          invoices.length > 0
            ? `${invoices.length} ${invoices.length === 1 ? "invoice" : "invoices"} · ${formatCurrency(total)}`
            : "Invoices issued by sellers will appear here."
        }
      />
      {invoices.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-8 w-8" />}
          title="No invoices yet"
          description="A seller issues an invoice when they pack your order."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">{i.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(i.issuedAt)}</TableCell>
                    <TableCell>{i.sellerName}</TableCell>
                    <TableCell className="text-right">{i.totalQuantity}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(i.totalAmount)}</TableCell>
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
