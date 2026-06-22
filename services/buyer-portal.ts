import "server-only";
import { cache } from "react";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { Order, type IOrder } from "@/models/Order";
import { Invoice, type IInvoice } from "@/models/Invoice";
import { PaymentCollection } from "@/models/PaymentCollection";
import { BuyerInvite } from "@/models/BuyerInvite";
import { ReturnRequest, type IReturnRequest, type ReturnStatus } from "@/models/Return";

export type BuyerProfile = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
};

export type BuyerOrderItemDTO = {
  productId: string;
  variantId: string | null;
  variantLabel: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  returnedQuantity: number; // already in a requested/approved return
  returnableQuantity: number; // still eligible to return
};

export type BuyerOrderDTO = {
  id: string;
  businessId: string;
  sellerName: string;
  sellerSlug: string;
  createdAt: string;
  productSummary: string;
  totalQuantity: number;
  totalAmount: number;
  paymentStatus: string;
  orderStatus: string;
};

export type BuyerReturnDTO = {
  id: string;
  orderId: string;
  businessId: string;
  sellerName: string;
  createdAt: string;
  status: ReturnStatus;
  reason: string;
  totalQuantity: number;
  totalAmount: number;
  items: { name: string; variantLabel: string; quantity: number; price: number }[];
};

export type BuyerOrderDetailDTO = BuyerOrderDTO & {
  items: BuyerOrderItemDTO[];
  returns: BuyerReturnDTO[];
  returnable: boolean;
};

export type BuyerSellerDTO = {
  businessId: string;
  name: string;
  slug: string;
  orderCount: number;
  ordered: number;
  collected: number;
  returnsCredit: number;
  balance: number;
};

export type BuyerInvoiceDTO = {
  id: string;
  invoiceNumber: string;
  businessId: string;
  sellerName: string;
  orderId: string;
  issuedAt: string;
  totalQuantity: number;
  totalAmount: number;
};

export type BuyerStats = {
  orderCount: number;
  sellerCount: number;
  totalSpent: number;
  outstanding: number;
};

// Orders in these states are still "live" and count toward what the buyer owes.
const COUNTED_ORDER = { $ne: "rejected" } as const;
// A buyer may raise a return once the seller has accepted/fulfilled the order.
const RETURNABLE_STATUSES = new Set(["accepted", "packed", "shipped", "delivered"]);

function summarize(items: { name: string; variantLabel?: string | null; quantity: number; included?: boolean }[]): string {
  return items
    .filter((i) => i.included !== false)
    .map((i) => `${i.name}${i.variantLabel ? ` (${i.variantLabel})` : ""} ×${i.quantity}`)
    .join(", ");
}

async function sellerMap(businessIds: Types.ObjectId[]): Promise<Map<string, { name: string; slug: string }>> {
  if (businessIds.length === 0) return new Map();
  const businesses = await Business.find({ _id: { $in: businessIds } })
    .select("name slug")
    .lean();
  return new Map(businesses.map((b) => [b._id.toString(), { name: b.name, slug: b.slug ?? "" }]));
}

export type SellerSummaryDTO = {
  businessId: string;
  name: string;
  slug: string;
  active: boolean;
};

// Lightweight seller lookup by id for the buyer module (e.g. labelling the cart
// with whose store it belongs to). Returns null for unknown/non-seller ids.
export const getSellerSummary = cache(async (businessId: string): Promise<SellerSummaryDTO | null> => {
  if (!businessId || !mongoose.isValidObjectId(businessId)) return null;
  await connectDB();
  const b = await Business.findOne({ _id: businessId, role: "seller" }).select("name slug status").lean();
  if (!b) return null;
  return {
    businessId: b._id.toString(),
    name: b.name,
    slug: b.slug ?? "",
    active: b.status === "active",
  };
});

export const getBuyerProfile = cache(async (userId: Types.ObjectId | string): Promise<BuyerProfile | null> => {
  await connectDB();
  const user = await User.findOne({ _id: userId, role: "buyer" }).select("name phone email").lean();
  if (!user) return null;
  const biz = await Business.findOne({ role: "buyer", ownerId: user._id }).select("address").lean();
  return {
    id: user._id.toString(),
    name: user.name,
    phone: user.phone ?? "",
    email: user.email ?? "",
    address: biz?.address ?? "",
  };
});

function orderToDTO(o: IOrder, sellers: Map<string, { name: string; slug: string }>): BuyerOrderDTO {
  const seller = sellers.get(o.businessId.toString());
  return {
    id: o._id.toString(),
    businessId: o.businessId.toString(),
    sellerName: seller?.name ?? "Unknown seller",
    sellerSlug: seller?.slug ?? "",
    createdAt: o.createdAt.toISOString(),
    productSummary: summarize(o.items),
    totalQuantity: o.totalQuantity,
    totalAmount: o.totalAmount,
    paymentStatus: o.paymentStatus,
    orderStatus: o.orderStatus,
  };
}

export const listBuyerOrders = cache(async (phone: string): Promise<BuyerOrderDTO[]> => {
  if (!phone) return [];
  await connectDB();
  const orders = await Order.find({ buyerPhone: phone }).sort({ createdAt: -1 }).lean<IOrder[]>();
  const sellers = await sellerMap(orders.map((o) => o.businessId));
  return orders.map((o) => orderToDTO(o, sellers));
});

function returnToDTO(r: IReturnRequest, sellerName: string): BuyerReturnDTO {
  return {
    id: r._id.toString(),
    orderId: r.orderId.toString(),
    businessId: r.businessId.toString(),
    sellerName,
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

export async function getBuyerOrderDetail(phone: string, orderId: string): Promise<BuyerOrderDetailDTO | null> {
  if (!phone || !mongoose.isValidObjectId(orderId)) return null;
  await connectDB();
  const o = await Order.findOne({ _id: orderId, buyerPhone: phone }).lean<IOrder>();
  if (!o) return null;
  const sellers = await sellerMap([o.businessId]);
  const sellerName = sellers.get(o.businessId.toString())?.name ?? "Unknown seller";
  const returns = await ReturnRequest.find({ orderId: o._id, buyerPhone: phone })
    .sort({ createdAt: -1 })
    .lean<IReturnRequest[]>();

  // Units already tied up in a requested/approved return (rejected frees them).
  const consumed = new Map<string, number>();
  for (const r of returns) {
    if (r.status === "rejected") continue;
    for (const it of r.items) {
      const k = `${it.productId.toString()}|${it.variantId ?? ""}`;
      consumed.set(k, (consumed.get(k) ?? 0) + it.quantity);
    }
  }

  const items: BuyerOrderItemDTO[] = o.items
    .filter((it) => it.included !== false)
    .map((it) => {
      const returnedQuantity = consumed.get(`${it.productId.toString()}|${it.variantId ?? ""}`) ?? 0;
      return {
        productId: it.productId.toString(),
        variantId: it.variantId ?? null,
        variantLabel: it.variantLabel ?? "",
        name: it.name,
        price: it.price,
        quantity: it.quantity,
        subtotal: it.price * it.quantity,
        returnedQuantity,
        returnableQuantity: Math.max(0, it.quantity - returnedQuantity),
      };
    });

  return {
    ...orderToDTO(o, sellers),
    items,
    returns: returns.map((r) => returnToDTO(r, sellerName)),
    returnable: RETURNABLE_STATUSES.has(o.orderStatus) && items.some((it) => it.returnableQuantity > 0),
  };
}

export const listBuyerReturns = cache(async (phone: string): Promise<BuyerReturnDTO[]> => {
  if (!phone) return [];
  await connectDB();
  const returns = await ReturnRequest.find({ buyerPhone: phone }).sort({ createdAt: -1 }).lean<IReturnRequest[]>();
  const sellers = await sellerMap(returns.map((r) => r.businessId));
  return returns.map((r) => returnToDTO(r, sellers.get(r.businessId.toString())?.name ?? "Unknown seller"));
});

export const listBuyerSellers = cache(async (phone: string): Promise<BuyerSellerDTO[]> => {
  if (!phone) return [];
  await connectDB();

  const [orders, collections, approvedReturns, connections] = await Promise.all([
    Order.find({ buyerPhone: phone, orderStatus: COUNTED_ORDER }).select("businessId totalAmount").lean(),
    PaymentCollection.find({ buyerPhone: phone }).select("businessId amount").lean(),
    ReturnRequest.find({ buyerPhone: phone, status: "approved" as ReturnStatus }).select("businessId totalAmount").lean(),
    BuyerInvite.find({ buyerPhone: phone }).select("businessId").lean(),
  ]);

  type Acc = { orderCount: number; ordered: number; collected: number; returnsCredit: number };
  const acc = new Map<string, Acc>();
  const get = (id: string): Acc => {
    let a = acc.get(id);
    if (!a) { a = { orderCount: 0, ordered: 0, collected: 0, returnsCredit: 0 }; acc.set(id, a); }
    return a;
  };
  // Explicit connections (buyer connected to a seller, or seller invited buyer)
  // surface even before any orders, with zeroed totals.
  for (const inv of connections) get(inv.businessId.toString());
  for (const o of orders) { const a = get(o.businessId.toString()); a.orderCount += 1; a.ordered += o.totalAmount; }
  for (const c of collections) get(c.businessId.toString()).collected += c.amount;
  for (const r of approvedReturns) get(r.businessId.toString()).returnsCredit += r.totalAmount;

  const ids = Array.from(acc.keys()).map((id) => new mongoose.Types.ObjectId(id));
  const sellers = await sellerMap(ids);

  return Array.from(acc.entries())
    .map(([id, a]) => {
      const seller = sellers.get(id);
      return {
        businessId: id,
        name: seller?.name ?? "Unknown seller",
        slug: seller?.slug ?? "",
        orderCount: a.orderCount,
        ordered: a.ordered,
        collected: a.collected,
        returnsCredit: a.returnsCredit,
        balance: a.ordered - a.collected - a.returnsCredit,
      };
    })
    .sort((x, y) => y.balance - x.balance);
});

export const listBuyerInvoices = cache(async (phone: string): Promise<BuyerInvoiceDTO[]> => {
  if (!phone) return [];
  await connectDB();
  const invoices = await Invoice.find({ buyerPhone: phone }).sort({ issuedAt: -1 }).lean<IInvoice[]>();
  const sellers = await sellerMap(invoices.map((i) => i.businessId));
  return invoices.map((i) => ({
    id: i._id.toString(),
    invoiceNumber: i.invoiceNumber,
    businessId: i.businessId.toString(),
    sellerName: sellers.get(i.businessId.toString())?.name ?? "Unknown seller",
    orderId: i.orderId.toString(),
    issuedAt: i.issuedAt.toISOString(),
    totalQuantity: i.totalQuantity,
    totalAmount: i.totalAmount,
  }));
});

export const getBuyerStats = cache(async (phone: string): Promise<BuyerStats> => {
  const sellers = await listBuyerSellers(phone);
  return {
    orderCount: sellers.reduce((s, x) => s + x.orderCount, 0),
    sellerCount: sellers.length,
    totalSpent: sellers.reduce((s, x) => s + x.ordered, 0),
    outstanding: sellers.reduce((s, x) => s + Math.max(0, x.balance), 0),
  };
});
