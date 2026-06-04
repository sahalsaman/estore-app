"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { requireRole } from "@/lib/dal";

export async function toggleVendorStatus(vendorId: string) {
  await requireRole("admin");
  await connectDB();
  const vendor = await Vendor.findById(vendorId);
  if (!vendor) return { ok: false as const, message: "Vendor not found" };
  vendor.status = vendor.status === "active" ? "disabled" : "active";
  await vendor.save();
  revalidatePath("/admin/vendors");
  revalidatePath(`/admin/vendors/${vendorId}`);
  return { ok: true as const, status: vendor.status };
}
