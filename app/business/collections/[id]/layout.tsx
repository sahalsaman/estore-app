import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { listPaymentCollections } from "@/services/payment-collections";
import { listVendorBuyers } from "@/services/orders";
import { CollectionsSidebar } from "../collections-sidebar";

export default async function CollectionDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  const [collections, vendorBuyers] = businessId
    ? await Promise.all([listPaymentCollections(businessId), listVendorBuyers(businessId)])
    : [[], []];
  const buyers = vendorBuyers.map((b) => ({ name: b.name, phone: b.phone }));

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <aside className="hidden lg:block lg:w-80 lg:shrink-0">
        <CollectionsSidebar collections={collections} buyers={buyers} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
