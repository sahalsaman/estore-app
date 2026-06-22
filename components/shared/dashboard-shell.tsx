"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogOut, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/actions/auth";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
};

export function DashboardShell({
  nav,
  user,
  brand,
  children,
}: {
  nav: NavItem[];
  user: { name: string; role: string };
  brand: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavList = (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {nav.map((item) => {
        const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-brand/10 text-brand" : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className="h-4 w-4">{item.icon}</span>
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-semibold text-brand-foreground">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-background md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-lg font-semibold">{brand}</span>
        </div>
        {NavList}
        <div className="mt-auto border-t p-4">
          <div className="mb-2">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs capitalize text-muted-foreground">{user.role}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm" className="w-full">
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </form>
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-background">
            <div className="flex h-16 items-center justify-between border-b px-4">
              <span className="text-lg font-semibold">{brand}</span>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {NavList}
            <div className="mt-auto border-t p-4">
              <form action={logoutAction}>
                <Button type="submit" variant="outline" size="sm" className="w-full">
                  <LogOut className="h-4 w-4" /> Logout
                </Button>
              </form>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-3 border-b bg-background px-4 md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="font-medium">Welcome back, {user.name.split(" ")[0]}</div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
