import "server-only";
import { cache } from "react";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { ReturnRequest, type IReturnRequest, type ReturnStatus } from "@/models/Return";
import { incrementStocks } from "@/services/products";

type ScopedRef = Types.ObjectId | string;

export type ReturnItemInput = {
  productId: string;
  variantId?: string | null;
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
};

export type ReturnDTO = {
  id: string;
  orderId: string;
  buyerName: string;
  buyerPhone: string;
  createdAt: string;
  status: ReturnStatus;
  reason: string;
  totalQuantity: number;
  totalAmount: number;
  items: { name: string; variantLabel: string; quantity: number; price: number }[];
};

function toDTO(r: IReturnRequest): ReturnDTO {
  return {
    id: r._id.toString(),
    orderId: r.orderId.toString(),
    buyerName: r.buyerName,
    buyerPhone: r.buyerPhone,
    createdAt: r.createdAt.toISOString(),
    status: r.status,
    reason: r.reason ?? "",
    totalQuantity: r.totalQuantity,
    totalAmount: r.totalAmount,
    items: r.items.map((it) => ({
      name: it.name,
      variantLabel: it.variantLabel ?? "",
      quantity: it.quantity,
      price: it.price,
    })),
  };
}

export async function createReturn(input: {
  businessId: ScopedRef;
  orderId: string;
  buyerId?: ScopedRef | null;
  buyerName: string;
  buyerPhone: string;
  items: ReturnItemInput[];
  reason?: string;
}): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  await connectDB();
  const items = input.items
    .filter((it) => mongoose.isValidObjectId(it.productId) && it.quantity > 0)
    .map((it) => ({
      productId: new mongoose.Types.ObjectId(it.productId),
      variantId: it.variantId ?? null,
      variantLabel: it.variantLabel ?? "",
      name: it.name,
      price: it.price,
      quantity: it.quantity,
    }));
  if (items.length === 0) return { ok: false, reason: "No valid items to return" };

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

  try {
    const doc = await ReturnRequest.create({
      businessId: input.businessId,
      orderId: input.orderId,
      buyerId: input.buyerId ?? null,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      items,
      totalQuantity,
      totalAmount,
      reason: input.reason ?? "",
      status: "requested",
    });
    return { ok: true, id: doc._id.toString() };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}

// Seller-scoped list of return requests for a business.
export const listReturns = cache(async (businessId: ScopedRef): Promise<ReturnDTO[]> => {
  await connectDB();
  const docs = await ReturnRequest.find({ businessId }).sort({ createdAt: -1 }).lean<IReturnRequest[]>();
  return docs.map(toDTO);
});

export async function countPendingReturns(businessId: ScopedRef): Promise<number> {
  await connectDB();
  return ReturnRequest.countDocuments({ businessId, status: "requested" });
}

// Approve: mark approved and restock the returned units. The approved amount
// then credits the buyer's balance with this seller (see buyer-portal balance).
export async function approveReturn(
  businessId: ScopedRef,
  returnId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(returnId)) return { ok: false, reason: "Invalid id" };
  await connectDB();
  const doc = await ReturnRequest.findOne({ _id: returnId, businessId });
  if (!doc) return { ok: false, reason: "Return not found" };
  if (doc.status !== "requested") return { ok: false, reason: "This return was already resolved" };

  doc.status = "approved";
  doc.resolvedAt = new Date();
  await doc.save();

  await incrementStocks(
    businessId,
    doc.items.map((it) => ({ id: it.productId.toString(), variantId: it.variantId, quantity: it.quantity }))
  ).catch(() => undefined);

  return { ok: true };
}

export async function rejectReturn(
  businessId: ScopedRef,
  returnId: string
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(returnId)) return { ok: false, reason: "Invalid id" };
  await connectDB();
  const doc = await ReturnRequest.findOne({ _id: returnId, businessId });
  if (!doc) return { ok: false, reason: "Return not found" };
  if (doc.status !== "requested") return { ok: false, reason: "This return was already resolved" };
  doc.status = "rejected";
  doc.resolvedAt = new Date();
  await doc.save();
  return { ok: true };
}
