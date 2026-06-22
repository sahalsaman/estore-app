import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ShoppingBag, Store, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOptionalSession } from "@/lib/dal";

export default async function LandingPage() {
  const session = await getOptionalSession();
  if (session) {
    if (session.role === "admin") redirect("/admin");
    if (session.role === "vendor") redirect("/business");
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-brand-foreground">
              <Store className="h-4 w-4" />
            </div>
            <span className="font-semibold">order.store</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/store">Browse stores</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/login">Seller sign in</Link>
            </Button>
                <Button variant="ghost" asChild>
              <Link href="/buyer-login">Buyer sign in</Link>
            </Button>
            <Button variant="brand" asChild>
              <Link href="/signup">Open your store</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <span className="inline-flex items-center rounded-full border bg-brand/5 px-3 py-1 text-xs font-medium text-brand">
            Direct ordering, finally simple
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
            Direct ordering,{" "}
            <span className="text-brand">stored and ready to ship.</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Every seller gets a public storefront. Buyers browse and order — no signup, just a mobile number at checkout. Orders land in your dashboard the moment they&apos;re placed.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button variant="brand" size="lg" asChild>
              <Link href="/store">
                Browse stores <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/signup">Open your store</Link>
            </Button>
          </div>
        </section>

        <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 md:grid-cols-3">
          {[
            {
              icon: <Store className="h-5 w-5" />,
              title: "Public storefront",
              body: "Every seller gets their own page with products, search, and category filters — share the link anywhere.",
            },
            {
              icon: <ShoppingBag className="h-5 w-5" />,
              title: "Frictionless orders",
              body: "Buyers add to cart and check out with just name and mobile. No signup, no friction.",
            },
            {
              icon: <BarChart3 className="h-5 w-5" />,
              title: "Live dashboard",
              body: "Orders, products, and revenue all in one place — no spreadsheets to wrangle.",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-6">
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-md bg-brand/10 text-brand">
                {f.icon}
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} order.store
      </footer>
    </div>
  );
}
