"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { requireRole } from "@/lib/dal";
import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMember,
} from "@/services/team";

const InviteSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const EditSchema = z.object({
  name: z.string().min(2, "Name is required"),
});

export type InviteMemberState =
  | {
      ok?: boolean;
      sharedName?: string;
      sharedEmail?: string;
      sharedPassword?: string;
      error?: string;
      fieldErrors?: Record<string, string[]>;
    }
  | undefined;

export type EditMemberState =
  | { ok?: boolean; error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

async function requireOwner() {
  const session = await requireRole("vendor");
  if (!session.businessId) return { ok: false as const, message: "No business linked" };
  await connectDB();
  const business = await Business.findById(session.businessId).select("ownerId").lean();
  if (!business) return { ok: false as const, message: "Business not found" };
  if (business.ownerId.toString() !== session.userId) {
    return { ok: false as const, message: "Only the business owner can manage the team" };
  }
  return { ok: true as const, session, businessId: business._id };
}

export async function inviteMemberAction(
  _prev: InviteMemberState,
  formData: FormData
): Promise<InviteMemberState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.message };

  const parsed = InviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const res = await inviteTeamMember(guard.businessId, parsed.data);
  if (!res.ok) return { error: res.reason };

  revalidatePath("/business/settings");
  return {
    ok: true,
    sharedName: res.member.name,
    sharedEmail: res.member.email,
    sharedPassword: parsed.data.password,
  };
}

export async function editMemberAction(
  memberUserId: string,
  _prev: EditMemberState,
  formData: FormData
): Promise<EditMemberState> {
  const guard = await requireOwner();
  if (!guard.ok) return { error: guard.message };

  const parsed = EditSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };

  const res = await updateTeamMember(guard.businessId, memberUserId, {
    name: parsed.data.name,
  });
  if (!res.ok) return { error: res.reason };

  revalidatePath("/business/settings");
  return { ok: true };
}

export async function removeMemberAction(memberUserId: string) {
  const guard = await requireOwner();
  if (!guard.ok) return { ok: false as const, message: guard.message };

  const res = await removeTeamMember(guard.businessId, memberUserId);
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/settings");
  return { ok: true as const };
}
