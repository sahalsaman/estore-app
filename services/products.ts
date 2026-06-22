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
  image?: string; // resolved from variantImages (color swatch), falls back to images[0]
};

export type VariantImageDTO = { value: string; image: string };

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
  variantImages: VariantImageDTO[];
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
  variantImages: VariantImageDTO[];
};

type ScopedRef = Types.ObjectId | string;

export function variantLabel(options: { value: string }[]): string {
  return options.map((o) => o.value).join(" / ");
}

// Pick the image for a variant: the first of its option values that has a
// configured swatch wins (e.g. the "Red" image for a Red/7 variant), else the
// product's first gallery image.
function imageForOptions(
  byValue: Map<string, string>,
  options: { value: string }[],
  fallback?: string
): string | undefined {
  for (const o of options) {
    const img = byValue.get(o.value);
    if (img) return img;
  }
  return fallback;
}

function variantToDTO(v: IProductVariant, byValue: Map<string, string>, fallback?: string): ProductVariantDTO {
  return {
    id: v._id.toString(),
    label: variantLabel(v.options),
    options: v.options.map((o) => ({ name: o.name, value: o.value })),
    price: v.price,
    wholesalePrice: v.wholesalePrice,
    stock: v.stock,
    status: v.status,
    image: imageForOptions(byValue, v.options, fallback),
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
    | "variantImages"
    | "updatedAt"
  >
): ProductDTO {
  const variantImages = (doc.variantImages ?? []).filter((vi) => vi.value && vi.image);
  const byValue = new Map(variantImages.map((vi) => [vi.value, vi.image]));
  const fallback = (doc.images ?? [])[0];
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
    variants: (doc.variants ?? []).map((v) => variantToDTO(v, byValue, fallback)),
    variantImages: variantImages.map((vi) => ({ value: vi.value, image: vi.image })),
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

export async function listProducts(businessId: ScopedRef): Promise<ProductDTO[]> {
  await connectDB();
  const docs = await Product.find({ businessId }).sort({ createdAt: -1 }).lean();
  return docs.map(toDTO);
}

export async function countProducts(businessId: ScopedRef): Promise<number> {
  await connectDB();
  return Product.countDocuments({ businessId });
}

export async function getProduct(businessId: ScopedRef, productId: string): Promise<ProductDTO | null> {
  if (!mongoose.isValidObjectId(productId)) return null;
  await connectDB();
  const doc = await Product.findOne({ _id: productId, businessId }).lean();
  return doc ? toDTO(doc) : null;
}

export async function createProduct(
  scope: { businessId: ScopedRef },
  input: ProductInput
): Promise<{ ok: true; product: ProductDTO } | { ok: false; reason: string }> {
  await connectDB();
  try {
    const roll = rollups(input);
    const doc = await Product.create({
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
      variantImages: input.hasVariants ? input.variantImages : [],
    });
    return { ok: true, product: toDTO(doc) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export async function updateProduct(
  businessId: ScopedRef,
  productId: string,
  input: ProductInput
): Promise<{ ok: true; product: ProductDTO } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(productId)) return { ok: false, reason: "Invalid product id" };
  await connectDB();
  try {
    const roll = rollups(input);
    const doc = await Product.findOneAndUpdate(
      { _id: productId, businessId },
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
          variantImages: input.hasVariants ? input.variantImages : [],
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
  businessId: ScopedRef,
  productId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(productId)) return { ok: false, reason: "Invalid product id" };
  await connectDB();
  const res = await Product.deleteOne({ _id: productId, businessId });
  if (res.deletedCount === 0) return { ok: false, reason: "Product not found" };
  return { ok: true };
}

// Put stock back (e.g. an approved return), variant-aware, keeping the product
// rollup in sync. The inverse of decrementStocks.
export async function incrementStocks(
  businessId: ScopedRef,
  items: { id: string; variantId?: string | null; quantity: number }[]
): Promise<void> {
  if (items.length === 0) return;
  await connectDB();
  await Promise.all(
    items
      .filter((it) => mongoose.isValidObjectId(it.id) && it.quantity > 0)
      .map((it) =>
        it.variantId
          ? Product.updateOne(
              { _id: it.id, businessId, "variants._id": it.variantId },
              { $inc: { "variants.$.stock": it.quantity, stock: it.quantity } }
            )
          : Product.updateOne({ _id: it.id, businessId }, { $inc: { stock: it.quantity } })
      )
  );
}

export async function decrementStocks(
  businessId: ScopedRef,
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
                businessId,
                variants: { $elemMatch: { _id: it.variantId, stock: { $gte: it.quantity } } },
              },
              { $inc: { "variants.$.stock": -it.quantity, stock: -it.quantity } }
            )
          : Product.updateOne(
              { _id: it.id, businessId, stock: { $gte: it.quantity } },
              { $inc: { stock: -it.quantity } }
            )
      )
  );
}
