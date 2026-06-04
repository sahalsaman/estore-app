"use server";

import { revalidatePath } from "next/cache";

import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { requireRole } from "@/lib/dal";
import { generateInvoiceForOrder } from "@/services/invoices";

export async function generateInvoiceAction(orderId: string) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId })
    .select("_id businessId")
    .lean();
  if (!vendor) return { ok: false as const, message: "Vendor not found" };

  const res = await generateInvoiceForOrder(vendor._id, vendor.businessId, orderId);
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${orderId}`);
  revalidatePath("/business/collections");
  return { ok: true as const, invoiceNumber: res.invoice.invoiceNumber };
}
