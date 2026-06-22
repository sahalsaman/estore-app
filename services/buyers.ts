import "server-only";
import { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User, type IUser } from "@/models/User";
import { Business } from "@/models/Business";
import { uniqueBusinessSlug } from "@/lib/slug";

// Buyers are modeled as a User (role "buyer") that owns a Business (role
// "buyer") holding their contact/address profile — there is no separate Buyer
// table. The phone number is the stable identifier.
export async function ensureBuyer(input: {
  name: string;
  phone: string;
  address?: string;
}): Promise<IUser> {
  await connectDB();
  let user = await User.findOne({ role: "buyer", phone: input.phone });
  if (!user) {
    user = await User.create({ name: input.name, phone: input.phone, role: "buyer" });
  }

  let business = await Business.findOne({ role: "buyer", ownerId: user._id });
  if (!business) {
    const slug = await uniqueBusinessSlug(input.phone || input.name);
    business = await Business.create({
      name: input.name,
      slug,
      phone: input.phone,
      address: input.address,
      ownerId: user._id,
      role: "buyer",
    });
  } else if (input.address !== undefined && input.address !== business.address) {
    business.address = input.address;
    await business.save();
  }

  if (!user.businessId || user.businessId.toString() !== business._id.toString()) {
    user.businessId = business._id;
    await user.save();
  }
  return user;
}

// The buyer's saved address, looked up by their User id (owner of the buyer
// Business). Returns "" when none on file.
export async function getBuyerAddress(userId: Types.ObjectId | string): Promise<string> {
  await connectDB();
  const business = await Business.findOne({ role: "buyer", ownerId: userId })
    .select("address")
    .lean();
  return business?.address ?? "";
}
