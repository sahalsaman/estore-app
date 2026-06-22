import { LayoutDashboard, ShoppingBag, ShoppingCart, Store, FileText, RotateCcw } from "lucide-react";
import { DashboardShell } from "@/components/shared/dashboard-shell";
import { requireRole } from "@/lib/dal";
import { getCart } from "@/actions/orders";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole("buyer");
  const cart = await getCart();
  const cartCount = cart.items.reduce((s, i) => s + i.quantity, 0);
  return (
    <DashboardShell
      brand="order.store"
      user={{ name: session.name, role: session.role }}
      nav={[
        { href: "/account/dashboard", label: "Dashboard", icon: <LayoutDashboard className="h-4 w-4" /> },
        { href: "/account/cart", label: "Cart", icon: <ShoppingCart className="h-4 w-4" />, badge: cartCount || undefined },
        { href: "/account/orders", label: "My orders", icon: <ShoppingBag className="h-4 w-4" /> },
        { href: "/account/sellers", label: "Sellers", icon: <Store className="h-4 w-4" /> },
        { href: "/account/invoices", label: "Invoices", icon: <FileText className="h-4 w-4" /> },
        { href: "/account/returns", label: "Returns", icon: <RotateCcw className="h-4 w-4" /> },
      ]}
    >
      {children}
    </DashboardShell>
  );
}
