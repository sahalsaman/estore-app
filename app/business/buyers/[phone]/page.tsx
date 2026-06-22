import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Plus,
  ShoppingCart,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { BuyerInvite } from "@/models/BuyerInvite";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { listOrdersForBuyer } from "@/services/orders";
import { listCollectionsForBuyer } from "@/services/payment-collections";
import { getBuyerAddress } from "@/services/buyers";
import { AddCollectionDialog } from "../../collections/add-collection-dialog";
import { AddOrderDialog } from "../../orders/add-order-dialog";
import { loadOrderOptions } from "../../orders/order-options";

const TABS = [
  { key: "detail", label: "Buyer detail" },
  { key: "orders", label: "Order history" },
  { key: "collections", label: "Payment collections" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export default async function VendorBuyerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ phone: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { phone: rawPhone } = await params;
  const phone = decodeURIComponent(rawPhone);
  const { tab: rawTab } = await searchParams;
  const tab: TabKey = (TABS.some((t) => t.key === rawTab) ? rawTab : "detail") as TabKey;

  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  if (!businessId) notFound();

  const [orders, collections, invite, orderOptions] = await Promise.all([
    listOrdersForBuyer(businessId, phone),
    listCollectionsForBuyer(businessId, phone),
    BuyerInvite.findOne({ businessId, buyerPhone: phone }).lean(),
    loadOrderOptions(businessId),
  ]);
  if (orders.length === 0 && collections.length === 0 && !invite) notFound();
  const buyerOptions = orderOptions.buyers;

  const userDoc = await User.findOne({ phone, role: "buyer" }).lean();
  const buyerAddress = userDoc ? await getBuyerAddress(userDoc._id) : "";
  const displayName =
    userDoc?.name ||
    orders[0]?.buyerName ||
    collections[0]?.buyerName ||
    invite?.buyerName ||
    "Unknown buyer";
  const isInvitedOnly = orders.length === 0;

  const totalSpent = orders.reduce((s, o) => s + o.totalAmount, 0);
  const totalCollected = collections.reduce((s, c) => s + c.amount, 0);
  const totalItems = orders.reduce((s, o) => s + o.totalQuantity, 0);
  const balance = totalSpent - totalCollected;
  const lastOrderAt = orders[0]?.createdAt;
  const buyerHrefBase = `/business/buyers/${encodeURIComponent(phone)}`;

  return (
    <div>
      <PageHeader
        title={displayName}
        description={phone}
        action={
          <div className="flex items-center gap-2">
            {isInvitedOnly && <Badge variant="warning">Invited</Badge>}
            <AddOrderDialog
              buyers={buyerOptions}
              products={orderOptions.products}
              defaultBuyerPhone={phone}
            />
            <Button variant="ghost" asChild>
              <Link href="/business/buyers">
                <ArrowLeft className="h-4 w-4" /> Back to buyers
              </Link>
            </Button>
          </div>
        }
      />

      <div className="mb-6 border-b">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Buyer tabs">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Link
                key={t.key}
                href={`${buyerHrefBase}?tab=${t.key}`}
                className={
                  active
                    ? "border-b-2 border-brand pb-3 text-sm font-medium text-brand"
                    : "border-b-2 border-transparent pb-3 text-sm font-medium text-muted-foreground hover:text-foreground"
                }
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {tab === "detail" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Orders" value={orders.length} icon={<ShoppingCart className="h-5 w-5" />} />
            <StatCard
              label="Total spent"
              value={formatCurrency(totalSpent)}
              accent="emerald"
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              label="Total collected"
              value={formatCurrency(totalCollected)}
              accent="amber"
              icon={<Wallet className="h-5 w-5" />}
            />
            <StatCard
              label="Outstanding"
              value={formatCurrency(Math.max(0, balance))}
              accent={balance > 0 ? "rose" : "emerald"}
              icon={<TrendingUp className="h-5 w-5" />}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{displayName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{phone}</span>
              </div>
              {userDoc?.email && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span>{userDoc.email}</span>
                </div>
              )}
              {buyerAddress && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Address</span>
                  <span className="text-right">{buyerAddress}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total items bought</span>
                <span>{totalItems}</span>
              </div>
              {lastOrderAt && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last order</span>
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatDate(lastOrderAt)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "orders" && (
        <Card>
          <CardHeader>
            <CardTitle>Order history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {orders.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">No orders from this buyer yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{formatDate(o.createdAt)}</TableCell>
                      <TableCell>
                        <Link
                          href={`/business/orders/${o.id}`}
                          className="text-brand hover:underline"
                        >
                          <code className="text-xs">{o.id.slice(-6)}</code>
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{o.productSummary}</TableCell>
                      <TableCell className="text-right">{formatCurrency(o.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {o.orderStatus}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "collections" && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Payment collections</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatCurrency(totalCollected)} received across {collections.length}{" "}
                {collections.length === 1 ? "entry" : "entries"}.
              </p>
            </div>
            <AddCollectionDialog
              buyers={buyerOptions}
              defaultBuyerPhone={phone}
              trigger={
                <Button variant="brand" size="sm">
                  <Plus className="h-4 w-4" /> Add payment collection
                </Button>
              }
            />
          </CardHeader>
          <CardContent className="p-0">
            {collections.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-8 w-8" />}
                title="No payment collections yet"
                description={`Record the first payment from ${displayName}.`}
                action={
                  <AddCollectionDialog
                    buyers={buyerOptions}
                    defaultBuyerPhone={phone}
                  />
                }
                className="border-0"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
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
                      <TableCell>
                        <Badge variant="secondary">
                          {METHOD_LABEL[c.method] ?? c.method}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{c.reference || "—"}</TableCell>
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
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
