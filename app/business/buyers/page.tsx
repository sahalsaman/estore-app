import Link from "next/link";
import { headers } from "next/headers";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { ListSearch } from "@/components/shared/list-search";
import { Users } from "lucide-react";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { requireRole } from "@/lib/dal";
import { formatCurrency } from "@/lib/utils";
import { listVendorBuyers } from "@/services/orders";
import { InviteBuyerDialog } from "./invite-buyer-dialog";

async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function VendorBuyersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  const business = businessId
    ? await Business.findById(businessId).select("name slug").lean()
    : null;
  const all = businessId ? await listVendorBuyers(businessId) : [];
  all.sort((a, b) => {
    if (a.orderCount === 0 && b.orderCount > 0) return 1;
    if (b.orderCount === 0 && a.orderCount > 0) return -1;
    if (a.orderCount > 0 && b.orderCount > 0) return b.totalSpent - a.totalSpent;
    return a.name.localeCompare(b.name);
  });

  const { q } = await searchParams;
  const needle = (q ?? "").trim().toLowerCase();
  const rows = needle
    ? all.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          (r.phone ?? "").toLowerCase().includes(needle)
      )
    : all;

  const origin = await getOrigin();
  const storeUrl = business?.slug ? `${origin}/store/${business.slug}` : "";
  const businessName = business?.name ?? "our store";

  return (
    <div>
      <PageHeader
        title="Buyers"
        description="Customers who ordered from you and buyers you've invited."
        action={<InviteBuyerDialog storeUrl={storeUrl} businessName={businessName} />}
      />

      <div className="mb-4">
        <ListSearch action="/business/buyers" q={q} placeholder="Search by name or phone" />
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No buyers yet"
          description="Invite a buyer or share your store link to start receiving orders."
          action={<InviteBuyerDialog storeUrl={storeUrl} businessName={businessName} />}
        />
      ) : rows.length === 0 ? (
        <EmptyState icon={<Users className="h-8 w-8" />} title="No matches" description={`Nothing matches "${q}".`} />
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Spent</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const href = r.phone ? `/business/buyers/${encodeURIComponent(r.phone)}` : null;
                const isInvitedOnly = r.orderCount === 0;
                return (
                  <TableRow key={r.phone || r.name}>
                    <TableCell className="font-medium">
                      {href ? (
                        <Link href={href} className="hover:text-brand hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        r.name
                      )}
                    </TableCell>
                    <TableCell>{r.phone || "—"}</TableCell>
                    <TableCell>
                      {isInvitedOnly ? (
                        <Badge variant="warning">Invited</Badge>
                      ) : (
                        <Badge variant="success">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>{r.orderCount}</TableCell>
                    <TableCell>{formatCurrency(r.totalSpent)}</TableCell>
                    <TableCell className="text-right">
                      {href ? (
                        <Link href={href} className="text-sm text-brand hover:underline">
                          View
                        </Link>
                      ) : null}
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
