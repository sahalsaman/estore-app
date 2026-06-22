import { RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { listReturns } from "@/services/returns";
import { ReturnActions } from "./return-actions";

const STATUS_VARIANT = {
  requested: "warning",
  approved: "success",
  rejected: "secondary",
} as const;

export default async function VendorReturnsPage() {
  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  const returns = businessId ? await listReturns(businessId) : [];
  const pendingCount = returns.filter((r) => r.status === "requested").length;

  return (
    <div>
      <PageHeader
        title="Returns"
        description={
          returns.length > 0
            ? `${pendingCount} pending · ${returns.length} total. Approving a return restocks the items and credits the buyer's balance.`
            : "Return requests from your buyers show up here."
        }
      />
      {returns.length === 0 ? (
        <EmptyState
          icon={<RotateCcw className="h-8 w-8" />}
          title="No returns yet"
          description="When a buyer requests a return on one of their orders, it'll appear here for you to approve or reject."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(r.createdAt)}</TableCell>
                    <TableCell>
                      <div className="font-medium">{r.buyerName}</div>
                      <div className="text-xs text-muted-foreground">{r.buyerPhone}</div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {r.items.map((it) => `${it.name}${it.variantLabel ? ` (${it.variantLabel})` : ""} ×${it.quantity}`).join(", ")}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(r.totalAmount)}</TableCell>
                    <TableCell className="max-w-[180px] truncate text-muted-foreground">{r.reason || "—"}</TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[r.status]} className="capitalize">{r.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {r.status === "requested" ? (
                        <ReturnActions returnId={r.id} />
                      ) : (
                        <span className="text-xs text-muted-foreground">Resolved</span>
                      )}
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
