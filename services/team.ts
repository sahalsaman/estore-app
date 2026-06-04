import "server-only";
import { cache } from "react";
import mongoose, { type Types } from "mongoose";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User, type IUser } from "@/models/User";
import { Vendor, type IVendor } from "@/models/Vendor";
import { Business } from "@/models/Business";

export type TeamMemberDTO = {
  userId: string;
  vendorId: string;
  name: string;
  email: string;
  phone: string;
  isOwner: boolean;
  status: "active" | "disabled";
  joinedAt: string;
};

type PopulatedVendor = Omit<IVendor, "userId"> & {
  userId: Pick<IUser, "_id" | "name" | "email" | "phone">;
};

export const listTeamMembers = cache(
  async (businessId: Types.ObjectId | string): Promise<TeamMemberDTO[]> => {
    await connectDB();
    const business = await Business.findById(businessId).select("ownerId").lean();
    if (!business) return [];

    const vendors = await Vendor.find({ businessId })
      .populate({ path: "userId", model: User, select: "name email phone" })
      .sort({ createdAt: 1 })
      .lean<PopulatedVendor[]>();

    const ownerIdStr = business.ownerId.toString();
    return vendors.map((v) => {
      const user = v.userId;
      const userId = user._id.toString();
      return {
        userId,
        vendorId: v._id.toString(),
        name: user.name,
        email: user.email ?? "",
        phone: user.phone ?? "",
        isOwner: userId === ownerIdStr,
        status: v.status,
        joinedAt: v.createdAt.toISOString(),
      };
    });
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

  const password = await bcrypt.hash(input.password, 10);
  try {
    const user = await User.create({
      name: input.name,
      email,
      password,
      role: "vendor",
      businessId,
    });
    const vendor = await Vendor.create({ userId: user._id, businessId });
    return {
      ok: true,
      member: {
        userId: user._id.toString(),
        vendorId: vendor._id.toString(),
        name: user.name,
        email: user.email ?? "",
        phone: user.phone ?? "",
        isOwner: false,
        status: vendor.status,
        joinedAt: vendor.createdAt.toISOString(),
      },
    };
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
  const vendor = await Vendor.findOne({ userId: memberUserId, businessId });
  if (!vendor) return { ok: false, reason: "Member not found in this business" };

  if (input.name !== undefined) {
    await User.updateOne({ _id: memberUserId }, { $set: { name: input.name } });
  }
  if (input.status) {
    vendor.status = input.status;
    await vendor.save();
  }
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
  const vendor = await Vendor.findOne({ userId: memberUserId, businessId });
  if (!vendor) return { ok: false, reason: "Member not found in this business" };
  await Vendor.deleteOne({ _id: vendor._id });
  await User.deleteOne({ _id: memberUserId, role: "vendor" });
  return { ok: true };
}
