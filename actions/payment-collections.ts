"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { requireRole } from "@/lib/dal";
import {
  createPaymentCollection,
  deletePaymentCollection,
  updatePaymentCollection,
} from "@/services/payment-collections";

const Schema = z.object({
  buyerName: z.string().min(2, "Buyer name is required"),
  buyerPhone: z.string().min(7, "Buyer phone is required"),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  method: z.enum(["cash", "upi", "bank_transfer", "cheque", "other"]),
  reference: z.string().optional(),
  notes: z.string().optional(),
  collectedAt: z.string().min(1, "Collection date is required"),
});

export type CollectionFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function createCollectionAction(
  _prev: CollectionFormState,
  formData: FormData
): Promise<CollectionFormState> {
  const session = await requireRole("vendor");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).select("_id businessId").lean();
  if (!vendor) return { error: "Vendor not found" };

  const res = await createPaymentCollection(
    { vendorId: vendor._id, businessId: vendor.businessId },
    {
      buyerName: parsed.data.buyerName,
      buyerPhone: parsed.data.buyerPhone,
      amount: parsed.data.amount,
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      collectedAt: new Date(parsed.data.collectedAt),
    }
  );
  if (!res.ok) return { error: res.reason };

  revalidatePath("/business/collections");
  return { ok: true };
}

export async function updateCollectionAction(
  id: string,
  _prev: CollectionFormState,
  formData: FormData
): Promise<CollectionFormState> {
  const session = await requireRole("vendor");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).select("_id").lean();
  if (!vendor) return { error: "Vendor not found" };

  const res = await updatePaymentCollection(vendor._id, id, {
    buyerName: parsed.data.buyerName,
    buyerPhone: parsed.data.buyerPhone,
    amount: parsed.data.amount,
    method: parsed.data.method,
    reference: parsed.data.reference,
    notes: parsed.data.notes,
    collectedAt: new Date(parsed.data.collectedAt),
  });
  if (!res.ok) return { error: res.reason };

  revalidatePath("/business/collections");
  revalidatePath(`/business/collections/${id}`);
  redirect(`/business/collections/${id}`);
}

export async function deleteCollectionAction(id: string) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).select("_id").lean();
  if (!vendor) return { ok: false as const, message: "Vendor not found" };
  const res = await deletePaymentCollection(vendor._id, id);
  if (!res.ok) return { ok: false as const, message: res.reason };
  revalidatePath("/business/collections");
  return { ok: true as const };
}
