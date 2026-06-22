"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireVendorBusinessId } from "@/lib/dal";
import { ensureBuyer } from "@/services/buyers";
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
  const businessId = await requireVendorBusinessId();
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (!businessId) return { error: "No business linked" };

  const buyer = await ensureBuyer({
    name: parsed.data.buyerName,
    phone: parsed.data.buyerPhone,
  });

  const res = await upsertBuyerInvite(
    { businessId },
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
