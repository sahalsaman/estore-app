import Link from "next/link";
import { Store } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireRole } from "@/lib/dal";
import { formatCurrency } from "@/lib/utils";
import { getBuyerProfile, listBuyerSellers } from "@/services/buyer-portal";
import { ConnectSellerDialog } from "./connect-seller-dialog";

export default async function BuyerSellersPage() {
  const session = await requireRole("buyer");
  const profile = await getBuyerProfile(session.userId);
  const sellers = await listBuyerSellers(profile?.phone ?? "");
  const totalOutstanding = sellers.reduce((s, x) => s + Math.max(0, x.balance), 0);

  return (
    <div>
      <PageHeader
        title="Sellers"
        description={
          sellers.length > 0
            ? `${sellers.length} ${sellers.length === 1 ? "seller" : "sellers"} · ${formatCurrency(totalOutstanding)} outstanding`
            : "Connect to a seller or place an order to get started."
        }
        action={<ConnectSellerDialog />}
      />
      {sellers.length === 0 ? (
        <EmptyState
          icon={<Store className="h-8 w-8" />}
          title="No sellers yet"
          description="Connect to a seller to start ordering and tracking your balance with them."
          action={<ConnectSellerDialog />}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                  <TableHead className="text-right">Ordered</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Returns</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sellers.map((s) => (
                  <TableRow key={s.businessId}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-right">{s.orderCount}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.ordered)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(s.collected)}</TableCell>
                    <TableCell className="text-right">{s.returnsCredit > 0 ? `−${formatCurrency(s.returnsCredit)}` : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={s.balance > 0 ? "warning" : "success"}>{formatCurrency(Math.max(0, s.balance))}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {s.slug ? (
                        <Link href={`/account/store/${s.slug}`} className="text-sm text-brand hover:underline">
                          Visit store
                        </Link>
                      ) : (
                        "—"
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
