"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { requireRole } from "@/lib/dal";
import { uniqueBusinessSlug } from "@/lib/slug";

export type VendorFormState = { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> } | undefined;

const ProfileSchema = z.object({
  businessName: z.string().min(2),
  phone: z.string().optional(),
  address: z.string().optional(),
  logo: z.string().optional(),
});

export async function updateBusinessProfile(_prev: VendorFormState, formData: FormData): Promise<VendorFormState> {
  const session = await requireRole("vendor");
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await connectDB();
  if (!session.businessId) return { error: "No business linked" };

  const existing = await Business.findById(session.businessId);
  if (!existing) return { error: "Business not found" };

  existing.name = parsed.data.businessName;
  existing.phone = parsed.data.phone;
  existing.address = parsed.data.address;
  existing.logo = parsed.data.logo?.trim() || undefined;
  if (!existing.slug) {
    existing.slug = await uniqueBusinessSlug(parsed.data.businessName, existing._id.toString());
  }
  await existing.save();
  revalidatePath("/business/settings");
  if (existing.slug) revalidatePath(`/store/${existing.slug}`);
  return { ok: true };
}
