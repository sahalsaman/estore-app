import "server-only";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Product, type IProduct, type IProductVariant } from "@/models/Product";

export type ProductVariantDTO = {
  id: string;
  label: string; // "Red / 7" — option values joined
  options: { name: string; value: string }[];
  price: number;
  wholesalePrice: number;
  stock: number;
  status: "active" | "inactive";
};

export type ProductDTO = {
  id: string;
  name: string;
  category: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  status: "active" | "inactive";
  description: string;
  images: string[];
  hasVariants: boolean;
  optionNames: string[];
  variants: ProductVariantDTO[];
  updatedAt: string;
};

export type ProductVariantInput = {
  options: { name: string; value: string }[];
  price: number;
  wholesalePrice: number;
  stock: number;
  status: "active" | "inactive";
};

export type ProductInput = {
  name: string;
  description?: string;
  price: number;
  wholesalePrice: number;
  stock: number;
  category: string;
  status: "active" | "inactive";
  images: string[];
  hasVariants: boolean;
  optionNames: string[];
  variants: ProductVariantInput[];
};

type ScopedRef = Types.ObjectId | string;

export function variantLabel(options: { value: string }[]): string {
  return options.map((o) => o.value).join(" / ");
}

function variantToDTO(v: IProductVariant): ProductVariantDTO {
  return {
    id: v._id.toString(),
    label: variantLabel(v.options),
    options: v.options.map((o) => ({ name: o.name, value: o.value })),
    price: v.price,
    wholesalePrice: v.wholesalePrice,
    stock: v.stock,
    status: v.status,
  };
}

function toDTO(
  doc: Pick<
    IProduct,
    | "_id"
    | "name"
    | "category"
    | "price"
    | "wholesalePrice"
    | "stock"
    | "status"
    | "description"
    | "images"
    | "hasVariants"
    | "optionNames"
    | "variants"
    | "updatedAt"
  >
): ProductDTO {
  return {
    id: doc._id.toString(),
    name: doc.name,
    category: doc.category,
    price: doc.price,
    wholesalePrice: doc.wholesalePrice,
    stock: doc.stock,
    status: doc.status,
    description: doc.description ?? "",
    images: doc.images ?? [],
    hasVariants: doc.hasVariants ?? false,
    optionNames: doc.optionNames ?? [],
    variants: (doc.variants ?? []).map(variantToDTO),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// When a product has variants, the top-level price/wholesalePrice/stock are
// rollups so every downstream list, sort and dashboard keeps working unchanged.
function rollups(input: ProductInput): { price: number; wholesalePrice: number; stock: number } {
  if (!input.hasVariants || input.variants.length === 0) {
    return { price: input.price, wholesalePrice: input.wholesalePrice, stock: input.stock };
  }
  const active = input.variants.filter((v) => v.status === "active");
  const priced = (active.length > 0 ? active : input.variants);
  return {
    price: Math.min(...priced.map((v) => v.price)),
    wholesalePrice: Math.min(...priced.map((v) => v.wholesalePrice)),
    stock: input.variants.reduce((s, v) => s + v.stock, 0),
  };
}

export async function listProducts(vendorId: ScopedRef): Promise<ProductDTO[]> {
  await connectDB();
  const docs = await Product.find({ vendorId }).sort({ createdAt: -1 }).lean();
  return docs.map(toDTO);
}

export async function countProducts(vendorId: ScopedRef): Promise<number> {
  await connectDB();
  return Product.countDocuments({ vendorId });
}

export async function getProduct(vendorId: ScopedRef, productId: string): Promise<ProductDTO | null> {
  if (!mongoose.isValidObjectId(productId)) return null;
  await connectDB();
  const doc = await Product.findOne({ _id: productId, vendorId }).lean();
  return doc ? toDTO(doc) : null;
}

export async function createProduct(
  scope: { vendorId: ScopedRef; businessId: ScopedRef },
  input: ProductInput
): Promise<{ ok: true; product: ProductDTO } | { ok: false; reason: string }> {
  await connectDB();
  try {
    const roll = rollups(input);
    const doc = await Product.create({
      vendorId: scope.vendorId,
      businessId: scope.businessId,
      name: input.name,
      description: input.description ?? "",
      price: roll.price,
      wholesalePrice: roll.wholesalePrice,
      stock: roll.stock,
      category: input.category,
      status: input.status,
      images: input.images,
      hasVariants: input.hasVariants,
      optionNames: input.hasVariants ? input.optionNames : [],
      variants: input.hasVariants ? input.variants : [],
    });
    return { ok: true, product: toDTO(doc) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export async function updateProduct(
  vendorId: ScopedRef,
  productId: string,
  input: ProductInput
): Promise<{ ok: true; product: ProductDTO } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(productId)) return { ok: false, reason: "Invalid product id" };
  await connectDB();
  try {
    const roll = rollups(input);
    const doc = await Product.findOneAndUpdate(
      { _id: productId, vendorId },
      {
        $set: {
          name: input.name,
          description: input.description ?? "",
          price: roll.price,
          wholesalePrice: roll.wholesalePrice,
          stock: roll.stock,
          category: input.category,
          status: input.status,
          images: input.images,
          hasVariants: input.hasVariants,
          optionNames: input.hasVariants ? input.optionNames : [],
          variants: input.hasVariants ? input.variants : [],
        },
      },
      { new: true }
    ).lean();
    if (!doc) return { ok: false, reason: "Product not found" };
    return { ok: true, product: toDTO(doc) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export async function deleteProduct(
  vendorId: ScopedRef,
  productId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(productId)) return { ok: false, reason: "Invalid product id" };
  await connectDB();
  const res = await Product.deleteOne({ _id: productId, vendorId });
  if (res.deletedCount === 0) return { ok: false, reason: "Product not found" };
  return { ok: true };
}

export async function decrementStocks(
  vendorId: ScopedRef,
  items: { id: string; variantId?: string | null; quantity: number }[]
): Promise<void> {
  if (items.length === 0) return;
  await connectDB();
  await Promise.all(
    items
      .filter((it) => mongoose.isValidObjectId(it.id) && it.quantity > 0)
      .map((it) =>
        it.variantId
          ? // Decrement the variant's stock atomically and keep the rollup in sync.
            Product.updateOne(
              {
                _id: it.id,
                vendorId,
                variants: { $elemMatch: { _id: it.variantId, stock: { $gte: it.quantity } } },
              },
              { $inc: { "variants.$.stock": -it.quantity, stock: -it.quantity } }
            )
          : Product.updateOne(
              { _id: it.id, vendorId, stock: { $gte: it.quantity } },
              { $inc: { stock: -it.quantity } }
            )
      )
  );
}
