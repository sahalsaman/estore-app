"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { requireVendorBusinessId } from "@/lib/dal";
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
  const businessId = await requireVendorBusinessId();
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!businessId) return { error: "No business linked" };

  await connectDB();
  const res = await createPaymentCollection(
    { businessId },
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
  const businessId = await requireVendorBusinessId();
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!businessId) return { error: "No business linked" };

  await connectDB();
  const res = await updatePaymentCollection(businessId, id, {
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
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };
  await connectDB();
  const res = await deletePaymentCollection(businessId, id);
  if (!res.ok) return { ok: false as const, message: res.reason };
  revalidatePath("/business/collections");
  return { ok: true as const };
}
