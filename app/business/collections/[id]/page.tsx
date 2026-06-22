import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPaymentCollection } from "@/services/payment-collections";
import { listVendorBuyers } from "@/services/orders";
import { updateCollectionAction } from "@/actions/payment-collections";
import { CollectionForm } from "../collection-form";
import { DeleteCollectionButton } from "./delete-button";

const METHOD_LABEL: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank transfer",
  cheque: "Cheque",
  other: "Other",
};

export default async function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  if (!businessId) notFound();
  const [collection, buyers] = await Promise.all([
    getPaymentCollection(businessId, id),
    listVendorBuyers(businessId),
  ]);
  if (!collection) notFound();

  const bound = updateCollectionAction.bind(null, id);
  const buyerHref = collection.buyerPhone
    ? `/business/buyers/${encodeURIComponent(collection.buyerPhone)}`
    : null;

  return (
    <div>
      <PageHeader
        title={`${formatCurrency(collection.amount)} from ${collection.buyerName}`}
        description={`${METHOD_LABEL[collection.method] ?? collection.method} · ${formatDate(collection.collectedAt)}`}
        action={
          <div className="flex gap-2">
            <Button variant="ghost" asChild>
              <Link href="/business/collections">
                <ArrowLeft className="h-4 w-4" /> Back
              </Link>
            </Button>
            <DeleteCollectionButton id={id} />
          </div>
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount</span>
            <span className="font-semibold">{formatCurrency(collection.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Method</span>
            <Badge variant="secondary" className="capitalize">
              {METHOD_LABEL[collection.method] ?? collection.method}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Buyer</span>
            <span className="text-right">
              {buyerHref ? (
                <Link href={buyerHref} className="text-brand hover:underline">
                  {collection.buyerName}
                </Link>
              ) : (
                collection.buyerName
              )}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Phone</span>
            <span>{collection.buyerPhone || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Reference</span>
            <span>{collection.reference || "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Collected on</span>
            <span>{formatDate(collection.collectedAt)}</span>
          </div>
          {collection.notes && (
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Notes</p>
              <p className="mt-1 whitespace-pre-wrap text-sm">{collection.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <h3 className="mb-2 mt-6 text-sm font-semibold text-muted-foreground">Edit</h3>
      <Card>
        <CardContent className="p-6">
          <CollectionForm
            action={bound}
            buyers={buyers}
            submitLabel="Save changes"
            initial={{
              buyerName: collection.buyerName,
              buyerPhone: collection.buyerPhone,
              amount: collection.amount,
              method: collection.method,
              reference: collection.reference,
              notes: collection.notes,
              collectedAt: collection.collectedAt,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
