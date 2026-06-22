import "server-only";
import { listVendorBuyers } from "@/services/orders";
import { listProducts } from "@/services/products";
import type { BuyerOption, ProductOption } from "./add-order-dialog";

// Builds the buyer + product option lists the AddOrderDialog needs, scoped to
// one seller business. Shared by the orders page, dashboard, and buyer detail.
export async function loadOrderOptions(
  businessId: string
): Promise<{ buyers: BuyerOption[]; products: ProductOption[] }> {
  const [vendorBuyers, products] = await Promise.all([
    listVendorBuyers(businessId),
    listProducts(businessId),
  ]);

  return {
    buyers: vendorBuyers.map((b) => ({ name: b.name, phone: b.phone })),
    products: products
      .filter((p) => p.status === "active")
      .map((p) => ({
        id: p.id,
        name: p.name,
        wholesalePrice: p.wholesalePrice,
        stock: p.stock,
        hasVariants: p.hasVariants,
        variants: p.variants.map((v) => ({
          id: v.id,
          label: v.label,
          wholesalePrice: v.wholesalePrice,
          stock: v.stock,
          status: v.status,
        })),
      })),
  };
}
