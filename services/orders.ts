import "server-only";
import { cache } from "react";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { Order, type IOrder, type OrderStatus, type PaymentStatus } from "@/models/Order";
import { Product } from "@/models/Product";
import { BuyerInvite, type IBuyerInvite } from "@/models/BuyerInvite";

export type OrderItemInput = {
  productId: string;
  variantId?: string | null;
  variantLabel?: string;
  name: string;
  price: number;
  quantity: number;
};

export type OrderDTO = {
  id: string;
  businessId: string;
  createdAt: string;
  buyerName: string;
  buyerPhone: string;
  productSummary: string;
  totalQuantity: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
};

export type OrderItemDTO = {
  productId: string;
  variantId: string | null;
  variantLabel: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  included: boolean;
};

export type OrderDetailDTO = OrderDTO & {
  items: OrderItemDTO[];
  buyerId: string | null;
};

export type CreateOrderInput = {
  businessId: Types.ObjectId | string;
  buyerId?: Types.ObjectId | string | null;
  buyerName: string;
  buyerPhone: string;
  items: OrderItemInput[];
};

function summarize(
  items: { name: string; variantLabel?: string | null; quantity: number; included?: boolean }[]
): string {
  return items
    .filter((i) => i.included !== false)
    .map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} ×${i.quantity}`)
    .join(", ");
}

function toDTO(doc: IOrder): OrderDTO {
  return {
    id: doc._id.toString(),
    businessId: doc.businessId.toString(),
    createdAt: doc.createdAt.toISOString(),
    buyerName: doc.buyerName,
    buyerPhone: doc.buyerPhone,
    productSummary: summarize(doc.items),
    totalQuantity: doc.totalQuantity,
    totalAmount: doc.totalAmount,
    paymentStatus: doc.paymentStatus,
    orderStatus: doc.orderStatus,
  };
}

export async function listOrders(businessId: Types.ObjectId | string): Promise<OrderDTO[]> {
  await connectDB();
  const docs = await Order.find({ businessId }).sort({ createdAt: -1 }).lean<IOrder[]>();
  return docs.map(toDTO);
}

export type VendorBuyer = {
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  invitedAt: string | null;
};

export const listVendorBuyers = cache(
  async (businessId: Types.ObjectId | string): Promise<VendorBuyer[]> => {
    await connectDB();
    const id = typeof businessId === "string" ? new mongoose.Types.ObjectId(businessId) : businessId;
    const [rows, invites] = await Promise.all([
      Order.aggregate<{
        _id: string;
        name: string;
        orderCount: number;
        totalSpent: number;
      }>([
        { $match: { businessId: id, buyerPhone: { $nin: [null, ""] } } },
        {
          $group: {
            _id: "$buyerPhone",
            name: { $last: "$buyerName" },
            orderCount: { $sum: 1 },
            totalSpent: { $sum: "$totalAmount" },
          },
        },
      ]),
      BuyerInvite.find({ businessId: id }).lean<IBuyerInvite[]>(),
    ]);

    const map = new Map<string, VendorBuyer>();
    for (const inv of invites) {
      map.set(inv.buyerPhone, {
        name: inv.buyerName,
        phone: inv.buyerPhone,
        orderCount: 0,
        totalSpent: 0,
        invitedAt: inv.createdAt.toISOString(),
      });
    }
    for (const r of rows) {
      const cur = map.get(r._id);
      if (cur) {
        cur.orderCount = r.orderCount;
        cur.totalSpent = r.totalSpent;
        cur.name = r.name;
      } else {
        map.set(r._id, {
          name: r.name,
          phone: r._id,
          orderCount: r.orderCount,
          totalSpent: r.totalSpent,
          invitedAt: null,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
);

export async function listOrdersForBuyer(
  businessId: Types.ObjectId | string,
  buyerPhone: string
): Promise<OrderDTO[]> {
  if (!buyerPhone) return [];
  await connectDB();
  const docs = await Order.find({ businessId, buyerPhone }).sort({ createdAt: -1 }).lean<IOrder[]>();
  return docs.map(toDTO);
}

export async function getOrderDetail(
  businessId: Types.ObjectId | string,
  orderId: string
): Promise<OrderDetailDTO | null> {
  if (!mongoose.isValidObjectId(orderId)) return null;
  await connectDB();
  const doc = await Order.findOne({ _id: orderId, businessId }).lean<IOrder>();
  if (!doc) return null;
  return {
    ...toDTO(doc),
    buyerId: doc.buyerId ? doc.buyerId.toString() : null,
    items: doc.items.map((it) => ({
      productId: it.productId.toString(),
      variantId: it.variantId ?? null,
      variantLabel: it.variantLabel ?? "",
      name: it.name,
      price: it.price,
      quantity: it.quantity,
      subtotal: it.price * it.quantity,
      included: it.included !== false,
    })),
  };
}

export async function updateOrderStatus(
  businessId: Types.ObjectId | string,
  orderId: string,
  patch: { paymentStatus?: PaymentStatus; orderStatus?: OrderStatus }
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(orderId)) return { ok: false, reason: "Invalid order id" };
  const set: Record<string, string> = {};
  if (patch.paymentStatus) set.paymentStatus = patch.paymentStatus;
  if (patch.orderStatus) set.orderStatus = patch.orderStatus;
  if (Object.keys(set).length === 0) return { ok: false, reason: "Nothing to update" };
  await connectDB();
  const res = await Order.updateOne({ _id: orderId, businessId }, { $set: set });
  if (res.matchedCount === 0) return { ok: false, reason: "Order not found" };
  return { ok: true };
}

export type OrderItemQuantityUpdate = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  included: boolean;
};

// A line is identified by product + variant, since one product may appear as
// several variant lines in the same order.
function lineKey(productId: string, variantId?: string | null): string {
  return `${productId}|${variantId ?? ""}`;
}

// Take `amount` units, scoped to a variant when present, keeping the product
// rollup stock in sync. Returns false when there isn't enough stock.
async function takeStock(
  businessId: Types.ObjectId | string,
  productId: string,
  variantId: string | null,
  amount: number
): Promise<boolean> {
  if (variantId) {
    const res = await Product.updateOne(
      {
        _id: productId,
        businessId,
        variants: { $elemMatch: { _id: variantId, stock: { $gte: amount } } },
      },
      { $inc: { "variants.$.stock": -amount, stock: -amount } }
    );
    return res.matchedCount > 0;
  }
  const res = await Product.updateOne(
    { _id: productId, businessId, stock: { $gte: amount } },
    { $inc: { stock: -amount } }
  );
  return res.matchedCount > 0;
}

// Give `amount` units back (best-effort), variant-scoped when present.
async function returnStock(
  businessId: Types.ObjectId | string,
  productId: string,
  variantId: string | null,
  amount: number
): Promise<void> {
  if (variantId) {
    await Product.updateOne(
      { _id: productId, businessId, "variants._id": variantId },
      { $inc: { "variants.$.stock": amount, stock: amount } }
    );
  } else {
    await Product.updateOne({ _id: productId, businessId }, { $inc: { stock: amount } });
  }
}

export async function updateOrderItems(
  businessId: Types.ObjectId | string,
  orderId: string,
  updates: OrderItemQuantityUpdate[]
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!mongoose.isValidObjectId(orderId)) return { ok: false, reason: "Invalid order id" };
  await connectDB();

  const order = await Order.findOne({ _id: orderId, businessId });
  if (!order) return { ok: false, reason: "Order not found" };

  const wanted = new Map<string, { quantity: number; included: boolean }>();
  for (const u of updates) {
    if (!mongoose.isValidObjectId(u.productId)) continue;
    if (!Number.isFinite(u.quantity) || u.quantity < 1) {
      return { ok: false, reason: "Quantity must be at least 1" };
    }
    wanted.set(lineKey(u.productId, u.variantId), {
      quantity: Math.floor(u.quantity),
      included: u.included !== false,
    });
  }

  type Delta = { productId: string; variantId: string | null; amount: number };
  const takes: Delta[] = [];
  const returns: Delta[] = [];
  let anyChange = false;

  for (const item of order.items) {
    const idStr = item.productId.toString();
    const variantId = item.variantId ?? null;
    const next = wanted.get(lineKey(idStr, variantId));
    if (!next) continue;
    const wasIncluded = item.included !== false;
    if (next.quantity === item.quantity && next.included === wasIncluded) continue;
    anyChange = true;
    const effectiveOld = wasIncluded ? item.quantity : 0;
    const effectiveNew = next.included ? next.quantity : 0;
    const delta = effectiveNew - effectiveOld;
    if (delta > 0) takes.push({ productId: idStr, variantId, amount: delta });
    else if (delta < 0) returns.push({ productId: idStr, variantId, amount: -delta });
  }

  if (!anyChange) return { ok: false, reason: "No changes" };

  // Reserve additional stock first; if any fails, roll back the ones already taken.
  const applied: Delta[] = [];
  for (const op of takes) {
    const ok = await takeStock(businessId, op.productId, op.variantId, op.amount);
    if (!ok) {
      for (const r of applied) {
        await returnStock(businessId, r.productId, r.variantId, r.amount);
      }
      return { ok: false, reason: "Not enough stock for one or more items" };
    }
    applied.push(op);
  }

  // Return stock for any reductions (best-effort).
  for (const op of returns) {
    await returnStock(businessId, op.productId, op.variantId, op.amount);
  }

  for (const item of order.items) {
    const idStr = item.productId.toString();
    const next = wanted.get(lineKey(idStr, item.variantId ?? null));
    if (!next) continue;
    item.quantity = next.quantity;
    item.included = next.included;
  }
  // Totals reflect what will be billed (included items only)
  order.totalQuantity = order.items.reduce(
    (s, i) => s + (i.included !== false ? i.quantity : 0),
    0
  );
  order.totalAmount = order.items.reduce(
    (s, i) => s + (i.included !== false ? i.price * i.quantity : 0),
    0
  );
  await order.save();

  return { ok: true };
}

export async function countOrders(businessId: Types.ObjectId | string): Promise<number> {
  await connectDB();
  return Order.countDocuments({ businessId });
}

export async function listOrdersByBuyerPhone(phone: string): Promise<OrderDTO[]> {
  if (!phone) return [];
  await connectDB();
  const docs = await Order.find({ buyerPhone: phone }).sort({ createdAt: -1 }).lean<IOrder[]>();
  return docs.map(toDTO);
}

export async function createOrder(
  input: CreateOrderInput
): Promise<{ ok: true; order: OrderDTO } | { ok: false; reason: string }> {
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
  if (items.length === 0) return { ok: false, reason: "No valid items" };

  const totalQuantity = items.reduce((s, i) => s + i.quantity, 0);
  const totalAmount = items.reduce((s, i) => s + i.price * i.quantity, 0);

  try {
    const doc = await Order.create({
      businessId: input.businessId,
      buyerId: input.buyerId ?? null,
      buyerName: input.buyerName,
      buyerPhone: input.buyerPhone,
      items,
      totalQuantity,
      totalAmount,
      paymentStatus: "pending",
      orderStatus: "placed",
    });
    return { ok: true, order: toDTO(doc) };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "unknown error" };
  }
}
