"use server";

import { revalidatePath } from "next/cache";

import { requireVendorBusinessId } from "@/lib/dal";
import { generateInvoiceForOrder } from "@/services/invoices";

export async function generateInvoiceAction(orderId: string) {
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };

  const res = await generateInvoiceForOrder(businessId, orderId);
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${orderId}`);
  revalidatePath("/business/collections");
  return { ok: true as const, invoiceNumber: res.invoice.invoiceNumber };
}
