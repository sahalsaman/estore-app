"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { Order, type IOrder } from "@/models/Order";
import { ReturnRequest, type IReturnRequest } from "@/models/Return";
import { requireRole, requireVendorBusinessId } from "@/lib/dal";
import { getBuyerProfile } from "@/services/buyer-portal";
import { createReturn, approveReturn, rejectReturn } from "@/services/returns";

const RETURNABLE_STATUSES = new Set(["accepted", "packed", "shipped", "delivered"]);

function itemKey(productId: string, variantId?: string | null): string {
  return `${productId}|${variantId ?? ""}`;
}

// Buyer raises a return against one of their own orders. Validates that each
// requested line is part of the order and not already (fully) returned.
export async function createReturnAction(
  orderId: string,
  lines: { productId: string; variantId?: string | null; quantity: number }[],
  reason?: string
) {
  const session = await requireRole("buyer");
  if (!mongoose.isValidObjectId(orderId)) return { ok: false as const, message: "Invalid order" };
  const profile = await getBuyerProfile(session.userId);
  if (!profile?.phone) return { ok: false as const, message: "Buyer profile not found" };

  await connectDB();
  const order = await Order.findOne({ _id: orderId, buyerPhone: profile.phone }).lean<IOrder>();
  if (!order) return { ok: false as const, message: "Order not found" };
  if (!RETURNABLE_STATUSES.has(order.orderStatus)) {
    return { ok: false as const, message: "This order can't be returned yet." };
  }

  // How many units per line are still returnable (ordered minus already
  // requested/approved; rejected returns free the quantity back up).
  const orderItems = new Map(
    order.items
      .filter((it) => it.included !== false)
      .map((it) => [itemKey(it.productId.toString(), it.variantId), it])
  );
  const priorReturns = await ReturnRequest.find({
    orderId: order._id,
    status: { $in: ["requested", "approved"] },
  }).lean<IReturnRequest[]>();
  const alreadyReturned = new Map<string, number>();
  for (const r of priorReturns) {
    for (const it of r.items) {
      const k = itemKey(it.productId.toString(), it.variantId);
      alreadyReturned.set(k, (alreadyReturned.get(k) ?? 0) + it.quantity);
    }
  }

  const items = [];
  for (const line of lines ?? []) {
    const qty = Math.floor(line.quantity || 0);
    if (qty <= 0) continue;
    const k = itemKey(line.productId, line.variantId);
    const oi = orderItems.get(k);
    if (!oi) return { ok: false as const, message: "An item is not part of this order." };
    const remaining = oi.quantity - (alreadyReturned.get(k) ?? 0);
    if (qty > remaining) {
      return {
        ok: false as const,
        message: `You can return at most ${remaining} of "${oi.name}".`,
      };
    }
    items.push({
      productId: line.productId,
      variantId: line.variantId ?? null,
      variantLabel: oi.variantLabel ?? "",
      name: oi.name,
      price: oi.price,
      quantity: qty,
    });
  }
  if (items.length === 0) return { ok: false as const, message: "Select at least one item to return." };

  const res = await createReturn({
    businessId: order.businessId,
    orderId: order._id.toString(),
    buyerId: order.buyerId ?? session.userId,
    buyerName: order.buyerName,
    buyerPhone: profile.phone,
    items,
    reason,
  });
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/account/returns");
  revalidatePath(`/account/orders/${orderId}`);
  revalidatePath("/business/returns");
  return { ok: true as const };
}

// Seller approves/rejects a return on their own business.
export async function updateReturnStatusAction(returnId: string, decision: "approve" | "reject") {
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };

  const res =
    decision === "approve"
      ? await approveReturn(businessId, returnId)
      : await rejectReturn(businessId, returnId);
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/returns");
  revalidatePath("/business/products");
  return { ok: true as const };
}
