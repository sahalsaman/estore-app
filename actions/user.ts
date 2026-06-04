"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { verifySession } from "@/lib/dal";
import { createSession } from "@/lib/session";

const ProfileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
});

export type UserProfileFormState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function updateOwnProfileAction(
  _prev: UserProfileFormState,
  formData: FormData
): Promise<UserProfileFormState> {
  const session = await verifySession();
  const parsed = ProfileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  await connectDB();
  const user = await User.findById(session.userId);
  if (!user) return { error: "User not found" };

  const phone = parsed.data.phone?.trim();
  if (phone && phone !== user.phone) {
    const existing = await User.findOne({ phone, _id: { $ne: user._id } });
    if (existing) return { fieldErrors: { phone: ["Phone already in use"] } };
  }

  user.name = parsed.data.name;
  user.phone = phone || undefined;
  await user.save();

  if (parsed.data.name !== session.name) {
    await createSession({
      userId: session.userId,
      role: session.role,
      businessId: session.businessId ?? null,
      name: parsed.data.name,
    });
  }

  revalidatePath("/business/settings");
  return { ok: true };
}
