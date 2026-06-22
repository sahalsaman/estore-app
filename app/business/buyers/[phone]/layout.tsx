import { connectDB } from "@/lib/db";
import { requireRole } from "@/lib/dal";
import { listVendorBuyers } from "@/services/orders";
import { BuyersSidebar, type BuyerSidebarItem } from "./buyers-sidebar";

export default async function BuyerDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ phone: string }>;
}) {
  const { phone: rawPhone } = await params;
  const activePhone = decodeURIComponent(rawPhone);
  const session = await requireRole("vendor");
  await connectDB();
  const businessId = session.businessId;
  const all = businessId ? await listVendorBuyers(businessId) : [];

  const buyers: BuyerSidebarItem[] = all
    .map((b) => ({
      name: b.name,
      phone: b.phone,
      orders: b.orderCount,
      total: b.totalSpent,
      invited: b.orderCount === 0,
    }))
    .sort((a, b) => {
      if (a.orders === 0 && b.orders > 0) return 1;
      if (b.orders === 0 && a.orders > 0) return -1;
      if (a.orders > 0 && b.orders > 0) return b.total - a.total;
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-6">
      <aside className="hidden lg:block lg:w-80 lg:shrink-0">
        <BuyersSidebar buyers={buyers} activePhone={activePhone} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
