"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { requireRole } from "@/lib/dal";

// `businessId` is the seller Business id (admin "vendors" pages are backed by
// seller Businesses now that the Vendor table is gone).
export async function toggleVendorStatus(businessId: string) {
  await requireRole("admin");
  await connectDB();
  const business = await Business.findOne({ _id: businessId, role: "seller" });
  if (!business) return { ok: false as const, message: "Seller not found" };
  business.status = business.status === "active" ? "disabled" : "active";
  await business.save();
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${businessId}`);
  return { ok: true as const, status: business.status };
}
