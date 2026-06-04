"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { User } from "@/models/User";
import { Buyer } from "@/models/Buyer";
import { requireRole } from "@/lib/dal";
import { upsertBuyerInvite } from "@/services/buyer-invites";

const Schema = z.object({
  buyerName: z.string().min(2, "Name is required"),
  buyerPhone: z.string().min(7, "Phone is required"),
});

export type InviteFormState =
  | {
      ok?: boolean;
      created?: boolean;
      sharedName?: string;
      sharedPhone?: string;
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export async function inviteBuyerAction(
  _prev: InviteFormState,
  formData: FormData
): Promise<InviteFormState> {
  const session = await requireRole("vendor");
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId })
    .select("_id businessId")
    .lean();
  if (!vendor) return { error: "Vendor not found" };

  let buyer = await User.findOne({ role: "buyer", phone: parsed.data.buyerPhone });
  if (!buyer) {
    buyer = await User.create({
      name: parsed.data.buyerName,
      phone: parsed.data.buyerPhone,
      role: "buyer",
    });
    await Buyer.create({ userId: buyer._id });
  }

  const res = await upsertBuyerInvite(
    { vendorId: vendor._id, businessId: vendor.businessId },
    {
      buyerName: parsed.data.buyerName,
      buyerPhone: parsed.data.buyerPhone,
      buyerId: buyer._id,
    }
  );
  if (!res.ok) return { error: res.reason };

  revalidatePath("/business/buyers");
  return {
    ok: true,
    created: res.created,
    sharedName: parsed.data.buyerName,
    sharedPhone: parsed.data.buyerPhone,
  };
}
