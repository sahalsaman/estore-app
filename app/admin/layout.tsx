import { LayoutDashboard, Building2, Users, ShoppingBag } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requireRole } from "@/lib/dal";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("admin");
  return (
    <DashboardShell
      brand="order.store"
      user={{ name: session.name, role: session.role }}
      nav={[
        { href: "/admin", label: "Overview", icon: <LayoutDashboard className="h-4 w-4" /> },
        { href: "/admin/businesses", label: "Businesses", icon: <Building2 className="h-4 w-4" /> },
        { href: "/admin/vendors", label: "Vendors", icon: <ShoppingBag className="h-4 w-4" /> },
        { href: "/admin/buyers", label: "Buyers", icon: <Users className="h-4 w-4" /> },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
