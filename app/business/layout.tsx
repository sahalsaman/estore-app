import { LayoutDashboard, Package, Users, Settings, ShoppingCart, Wallet } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requireRole } from "@/lib/dal";

export default async function VendorLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("vendor");
  return (
    <DashboardShell
      brand="order.store"
      user={{ name: session.name, role: session.role }}
      nav={[
        { href: "/business/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
        { href: "/business/products", label: "Products", icon: <Package className="h-4 w-4" /> },
        { href: "/business/orders", label: "Orders", icon: <ShoppingCart className="h-4 w-4" /> },
        { href: "/business/collections", label: "Payment Collections", icon: <Wallet className="h-4 w-4" /> },
        { href: "/business/buyers", label: "Buyers", icon: <Users className="h-4 w-4" /> },
        { href: "/business/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
