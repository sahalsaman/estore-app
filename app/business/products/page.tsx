import { Package } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { ListSearch } from "@/components/shared/list-search";
import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { requireRole } from "@/lib/dal";
import { formatCurrency } from "@/lib/utils";
import { listProducts } from "@/services/products";
import { AddProductDialog } from "./add-product-dialog";
import { EditProductDialog } from "./edit-product-dialog";

export default async function VendorProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).lean();
  if (!vendor) return null;
  const all = await listProducts(vendor._id);
  const { q } = await searchParams;
  const needle = (q ?? "").trim().toLowerCase();
  const products = needle
    ? all.filter(
        (p) =>
          p.name.toLowerCase().includes(needle) ||
          p.category.toLowerCase().includes(needle)
      )
    : all;

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage the catalogue customers see on your storefront."
        action={<AddProductDialog />}
      />

      <div className="mb-4">
        <ListSearch action="/business/products" q={q} placeholder="Search by name or category" />
      </div>

      {all.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products yet"
          description="Add your first product to start selling."
          action={<AddProductDialog />}
        />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No matches"
          description={`Nothing matches "${q}".`}
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Selling price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.name}
                      {p.hasVariants && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          · {p.variants.length} option{p.variants.length === 1 ? "" : "s"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>{p.hasVariants && "from "}{formatCurrency(p.price)}</TableCell>
                    <TableCell>{p.hasVariants && "from "}{formatCurrency(p.wholesalePrice)}</TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>
                      <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <EditProductDialog
                        product={{
                          id: p.id,
                          name: p.name,
                          description: p.description,
                          price: p.price,
                          wholesalePrice: p.wholesalePrice,
                          stock: p.stock,
                          category: p.category,
                          status: p.status,
                          images: p.images,
                          hasVariants: p.hasVariants,
                          optionNames: p.optionNames,
                          variants: p.variants.map((v) => ({
                            options: v.options,
                            price: v.price,
                            wholesalePrice: v.wholesalePrice,
                            stock: v.stock,
                            status: v.status,
                          })),
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
