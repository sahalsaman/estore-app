"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { requireVendorBusinessId } from "@/lib/dal";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductInput,
  type ProductVariantInput,
} from "@/services/products";

export type ProductFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const VariantInputSchema = z.object({
  options: z.array(z.object({ name: z.string(), value: z.string().min(1) })).default([]),
  price: z.coerce.number().min(0),
  wholesalePrice: z.coerce.number().min(0),
  stock: z.coerce.number().int().min(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

const ProductSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(0).default(0),
  wholesalePrice: z.coerce.number().min(0).default(0),
  stock: z.coerce.number().int().min(0).default(0),
  category: z.string().min(1, "Category is required"),
  status: z.enum(["active", "inactive"]).default("active"),
  images: z.string().optional(),
  hasVariants: z
    .preprocess((v) => v === "true" || v === "on" || v === true, z.boolean())
    .default(false),
  optionNames: z.string().optional(), // JSON array of strings
  variantsJson: z.string().optional(), // JSON array of variants
  variantImagesJson: z.string().optional(), // JSON array of { value, image }
});

const VariantImageInputSchema = z.object({
  value: z.string().min(1),
  image: z.string().trim().min(1),
});

function parseImages(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean);
}

type ParseResult =
  | { ok: true; input: ProductInput }
  | { ok: false; fieldErrors: Record<string, string[]> };

function buildProductInput(formData: FormData): ParseResult {
  const parsed = ProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const d = parsed.data;

  const base = {
    name: d.name,
    description: d.description,
    category: d.category,
    status: d.status,
    images: parseImages(d.images),
  };

  if (!d.hasVariants) {
    return {
      ok: true,
      input: {
        ...base,
        price: d.price,
        wholesalePrice: d.wholesalePrice,
        stock: d.stock,
        hasVariants: false,
        optionNames: [],
        variants: [],
        variantImages: [],
      },
    };
  }

  let optionNames: string[] = [];
  let rawVariants: unknown[] = [];
  let rawVariantImages: unknown[] = [];
  try {
    optionNames = d.optionNames ? (JSON.parse(d.optionNames) as string[]) : [];
    rawVariants = d.variantsJson ? (JSON.parse(d.variantsJson) as unknown[]) : [];
    rawVariantImages = d.variantImagesJson ? (JSON.parse(d.variantImagesJson) as unknown[]) : [];
  } catch {
    return { ok: false, fieldErrors: { variantsJson: ["Could not read the options"] } };
  }

  const variants: ProductVariantInput[] = [];
  for (const raw of rawVariants) {
    const v = VariantInputSchema.safeParse(raw);
    if (!v.success) {
      return { ok: false, fieldErrors: { variantsJson: ["Each option needs a valid price and stock"] } };
    }
    variants.push(v.data);
  }

  if (variants.length === 0) {
    return { ok: false, fieldErrors: { variantsJson: ["Add at least one option combination"] } };
  }

  // Keep only images attached to values that are actually in play; drop blanks.
  const liveValues = new Set(variants.flatMap((v) => v.options.map((o) => o.value)));
  const variantImages: { value: string; image: string }[] = [];
  for (const raw of rawVariantImages) {
    const vi = VariantImageInputSchema.safeParse(raw);
    if (vi.success && liveValues.has(vi.data.value)) {
      variantImages.push(vi.data);
    }
  }

  return {
    ok: true,
    input: {
      ...base,
      price: 0,
      wholesalePrice: 0,
      stock: 0,
      hasVariants: true,
      optionNames: optionNames.map((n) => n.trim()).filter(Boolean),
      variants,
      variantImages,
    },
  };
}

async function storeSlug(vendorBusinessId: unknown): Promise<string | null> {
  const business = await Business.findById(vendorBusinessId).select("slug").lean();
  return business?.slug ?? null;
}

export async function createProductAction(_prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const businessId = await requireVendorBusinessId();
  const parsed = buildProductInput(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  if (!businessId) return { error: "No business linked" };

  await connectDB();
  const created = await createProduct({ businessId }, parsed.input);
  if (!created.ok) return { error: `Couldn't create product: ${created.reason}` };

  revalidatePath("/business/products");
  const slug = await storeSlug(businessId);
  if (slug) revalidatePath(`/store/${slug}`);
  return { ok: true };
}

export async function updateProductAction(productId: string, _prev: ProductFormState, formData: FormData): Promise<ProductFormState> {
  const businessId = await requireVendorBusinessId();
  const parsed = buildProductInput(formData);
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors };
  if (!businessId) return { error: "No business linked" };

  await connectDB();
  const updated = await updateProduct(businessId, productId, parsed.input);
  if (!updated.ok) return { error: `Couldn't update product: ${updated.reason}` };

  revalidatePath("/business/products");
  const slug = await storeSlug(businessId);
  if (slug) revalidatePath(`/store/${slug}`);
  return { ok: true };
}

export async function deleteProductAction(productId: string) {
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };
  await connectDB();
  const res = await deleteProduct(businessId, productId);
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/products");
  const slug = await storeSlug(businessId);
  if (slug) revalidatePath(`/store/${slug}`);
  return { ok: true as const };
}
