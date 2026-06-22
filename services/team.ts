import "server-only";
import { cache } from "react";
import mongoose, { type Types } from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, type IUser } from "@/models/User";
import { Business } from "@/models/Business";

export type TeamMemberDTO = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  isOwner: boolean;
  status: "active" | "disabled";
  joinedAt: string;
};

// Team members are simply the Users with role "vendor" attached to a business.
// The business owner is Business.ownerId; per-member status lives on User.status.
function toMemberDTO(u: IUser, ownerIdStr: string): TeamMemberDTO {
  const userId = u._id.toString();
  return {
    userId,
    name: u.name,
    email: u.email ?? "",
    phone: u.phone ?? "",
    isOwner: userId === ownerIdStr,
    status: u.status,
    joinedAt: u.createdAt.toISOString(),
  };
}

export const listTeamMembers = cache(
  async (businessId: Types.ObjectId | string): Promise<TeamMemberDTO[]> => {
    await connectDB();
    const business = await Business.findById(businessId).select("ownerId").lean();
    if (!business) return [];

    const members = await User.find({ businessId, role: "vendor" })
      .sort({ createdAt: 1 })
      .lean<IUser[]>();

    const ownerIdStr = business.ownerId.toString();
    return members.map((u) => toMemberDTO(u, ownerIdStr));
  }
);

export async function inviteTeamMember(
  businessId: Types.ObjectId | string,
  input: { name: string; email: string; password: string }
): Promise<
  | { ok: true; member: TeamMemberDTO }
  | { ok: false; reason: string }
> {
  await connectDB();
  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ email });
  if (existing) return { ok: false, reason: "An account with this email already exists" };

  const business = await Business.findById(businessId).select("ownerId").lean();
  if (!business) return { ok: false, reason: "Business not found" };

  const password = await bcrypt.hash(input.password, 10);
  try {
    const user = await User.create({
      name: input.name,
      email,
      password,
      role: "vendor",
      businessId,
    });
    return { ok: true, member: toMemberDTO(user, business.ownerId.toString()) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

export async function updateTeamMember(
  businessId: Types.ObjectId | string,
  memberUserId: string,
  input: { name?: string; status?: "active" | "disabled" }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(memberUserId)) return { ok: false, reason: "Invalid id" };
  await connectDB();
  const user = await User.findOne({ _id: memberUserId, businessId, role: "vendor" });
  if (!user) return { ok: false, reason: "Member not found in this business" };

  if (input.name !== undefined) user.name = input.name;
  if (input.status) user.status = input.status;
  await user.save();
  return { ok: true };
}

export async function removeTeamMember(
  businessId: Types.ObjectId | string,
  memberUserId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(memberUserId)) return { ok: false, reason: "Invalid id" };
  await connectDB();
  const business = await Business.findById(businessId).select("ownerId").lean();
  if (!business) return { ok: false, reason: "Business not found" };
  if (business.ownerId.toString() === memberUserId) {
    return { ok: false, reason: "The owner cannot be removed" };
  }
  const res = await User.deleteOne({ _id: memberUserId, businessId, role: "vendor" });
  if (res.deletedCount === 0) return { ok: false, reason: "Member not found in this business" };
  return { ok: true };
}
