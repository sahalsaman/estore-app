"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { Vendor } from "@/models/Vendor";
import { Business } from "@/models/Business";
import { User } from "@/models/User";
import { Buyer } from "@/models/Buyer";
import { decrementStocks, getProduct } from "@/services/products";
import {
  createOrder,
  updateOrderItems,
  updateOrderStatus,
  type OrderItemQuantityUpdate,
} from "@/services/orders";
import { generateInvoiceForOrder, getInvoiceForOrder } from "@/services/invoices";
import type { OrderStatus, PaymentStatus } from "@/models/Order";
import { requireRole } from "@/lib/dal";
import type { CartItem } from "@/types";

const PAYMENT_STATUSES: PaymentStatus[] = ["pending", "paid", "failed"];
const ORDER_STATUSES: OrderStatus[] = [
  "placed",
  "accepted",
  "rejected",
  "packed",
  "shipped",
  "delivered",
];

const CART_COOKIE = "wh_cart";

type Cart = { vendorId: string | null; items: CartItem[] };

async function readCart(): Promise<Cart> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return { vendorId: null, items: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) return parsed as Cart;
    return { vendorId: null, items: [] };
  } catch {
    return { vendorId: null, items: [] };
  }
}

async function writeCart(cart: Cart) {
  const jar = await cookies();
  jar.set(CART_COOKIE, JSON.stringify(cart), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function getCartForVendor(vendorId: string): Promise<CartItem[]> {
  const cart = await readCart();
  if (cart.vendorId !== vendorId) return [];
  return cart.items;
}

async function slugForVendor(vendorId: string): Promise<string | null> {
  const vendor = await Vendor.findById(vendorId).select("businessId").lean();
  if (!vendor) return null;
  const business = await Business.findById(vendor.businessId).select("slug").lean();
  return business?.slug ?? null;
}

// Cart lines are identified by product + variant (a product with variants
// appears as one line per chosen option).
function sameLine(c: CartItem, productId: string, variantId?: string | null): boolean {
  return c.productId === productId && (c.variantId ?? "") === (variantId ?? "");
}

// Validate a set of {variantId, quantity} lines for one product against fresh
// data and turn them into cart items.
async function resolveCartLines(
  vendorId: string,
  productId: string,
  lines: { variantId?: string | null; quantity: number }[]
): Promise<{ ok: true; items: CartItem[] } | { ok: false; message: string }> {
  const product = await getProduct(vendorId, productId);
  if (!product || product.status !== "active") {
    return { ok: false, message: "Product unavailable" };
  }
  const items: CartItem[] = [];
  for (const line of lines) {
    const qty = Math.floor(line.quantity || 0);
    if (qty <= 0) continue;
    if (product.hasVariants) {
      if (!line.variantId) return { ok: false, message: "Choose an option" };
      const v = product.variants.find((x) => x.id === line.variantId);
      if (!v || v.status !== "active") return { ok: false, message: "That option is unavailable" };
      if (v.stock <= 0) return { ok: false, message: `${v.label} is out of stock` };
      items.push({
        productId,
        variantId: v.id,
        variantLabel: v.label,
        vendorId,
        name: product.name,
        price: v.wholesalePrice,
        image: product.images[0],
        quantity: qty,
      });
    } else {
      if (product.stock <= 0) return { ok: false, message: "Out of stock" };
      items.push({
        productId,
        vendorId,
        name: product.name,
        price: product.wholesalePrice,
        image: product.images[0],
        quantity: qty,
      });
    }
  }
  if (items.length === 0) return { ok: false, message: "Nothing to add" };
  return { ok: true, items };
}

async function addLinesToCart(
  vendorIdHint: string,
  productId: string,
  lines: { variantId?: string | null; quantity: number }[]
) {
  if (!mongoose.isValidObjectId(vendorIdHint)) return { ok: false as const, message: "Invalid store" };
  await connectDB();
  const vendor = await Vendor.findById(vendorIdHint);
  if (!vendor || vendor.status !== "active") return { ok: false as const, message: "Store unavailable" };

  const vendorId = vendor._id.toString();
  const resolved = await resolveCartLines(vendorId, productId, lines);
  if (!resolved.ok) return { ok: false as const, message: resolved.message };

  let cart = await readCart();
  let switched = false;
  if (cart.vendorId && cart.vendorId !== vendorId && cart.items.length > 0) {
    cart = { vendorId, items: [] };
    switched = true;
  } else {
    cart.vendorId = vendorId;
  }

  for (const item of resolved.items) {
    const existing = cart.items.find((c) => sameLine(c, item.productId, item.variantId));
    if (existing) existing.quantity += item.quantity;
    else cart.items.push(item);
  }

  await writeCart(cart);
  const slug = await slugForVendor(vendorId);
  if (slug) {
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/cart`);
  }
  return { ok: true as const, count: cart.items.reduce((s, c) => s + c.quantity, 0), switched };
}

export async function addToCartAction(
  productId: string,
  vendorIdHint: string,
  quantity = 1,
  variantId?: string
) {
  return addLinesToCart(vendorIdHint, productId, [{ variantId, quantity }]);
}

export async function addVariantsToCartAction(
  productId: string,
  vendorIdHint: string,
  lines: { variantId: string; quantity: number }[]
) {
  const wanted = (lines ?? []).filter((l) => l.quantity > 0);
  if (wanted.length === 0) return { ok: false as const, message: "Enter a quantity for at least one option" };
  return addLinesToCart(vendorIdHint, productId, wanted);
}

export async function updateCartItemAction(
  productId: string,
  quantity: number,
  variantId?: string
) {
  const cart = await readCart();
  const next: Cart = {
    vendorId: cart.vendorId,
    items:
      quantity <= 0
        ? cart.items.filter((c) => !sameLine(c, productId, variantId))
        : cart.items.map((c) => (sameLine(c, productId, variantId) ? { ...c, quantity } : c)),
  };
  if (next.items.length === 0) next.vendorId = null;
  await writeCart(next);
  if (cart.vendorId) {
    const slug = await slugForVendor(cart.vendorId);
    if (slug) revalidatePath(`/store/${slug}/cart`);
  }
  return { ok: true as const };
}

export async function removeFromCartAction(productId: string, variantId?: string) {
  const cart = await readCart();
  const items = cart.items.filter((c) => !sameLine(c, productId, variantId));
  await writeCart({ vendorId: items.length ? cart.vendorId : null, items });
  if (cart.vendorId) {
    const slug = await slugForVendor(cart.vendorId);
    if (slug) revalidatePath(`/store/${slug}/cart`);
  }
  return { ok: true as const };
}

const CheckoutSchema = z.object({
  vendorId: z.string().min(1),
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Mobile number is required"),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = CheckoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { vendorId, name, phone, address } = parsed.data;
  if (!mongoose.isValidObjectId(vendorId)) return { error: "Invalid store" };

  const cart = await readCart();
  if (cart.vendorId !== vendorId || cart.items.length === 0) {
    return { error: "Your cart is empty" };
  }

  await connectDB();
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || vendor.status !== "active") return { error: "Store is unavailable" };
  const business = await Business.findById(vendor.businessId).select("slug").lean();
  const slug = business?.slug;

  const verified: {
    productId: string;
    variantId: string | null;
    variantLabel: string;
    name: string;
    price: number;
    quantity: number;
  }[] = [];
  for (const item of cart.items) {
    const fresh = await getProduct(vendor._id, item.productId);
    if (!fresh || fresh.status !== "active") {
      return { error: `"${item.name}" is no longer available` };
    }
    if (fresh.hasVariants) {
      const v = item.variantId ? fresh.variants.find((x) => x.id === item.variantId) : undefined;
      if (!v || v.status !== "active") {
        return { error: `An option of "${fresh.name}" is no longer available` };
      }
      if (v.stock < item.quantity) {
        return { error: `Only ${v.stock} of "${fresh.name} (${v.label})" in stock` };
      }
      verified.push({
        productId: fresh.id,
        variantId: v.id,
        variantLabel: v.label,
        name: fresh.name,
        price: v.wholesalePrice,
        quantity: item.quantity,
      });
    } else {
      if (fresh.stock < item.quantity) {
        return { error: `Only ${fresh.stock} of "${fresh.name}" in stock` };
      }
      verified.push({
        productId: fresh.id,
        variantId: null,
        variantLabel: "",
        name: fresh.name,
        price: fresh.wholesalePrice,
        quantity: item.quantity,
      });
    }
  }

  let buyer = await User.findOne({ role: "buyer", phone });
  if (!buyer) {
    buyer = await User.create({ name, phone, role: "buyer" });
    await Buyer.create({ userId: buyer._id, address });
  } else if (address) {
    await Buyer.updateOne({ userId: buyer._id }, { address }, { upsert: true });
  }

  const result = await createOrder({
    vendorId: vendor._id,
    businessId: vendor.businessId,
    buyerId: buyer._id,
    buyerName: name,
    buyerPhone: phone,
    items: verified,
  });
  if (!result.ok) {
    return { error: `Couldn't save the order: ${result.reason}` };
  }

  await decrementStocks(
    vendor._id,
    verified.map((v) => ({ id: v.productId, variantId: v.variantId, quantity: v.quantity }))
  ).catch(() => undefined);

  await writeCart({ vendorId: null, items: [] });
  if (slug) {
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/cart`);
    redirect(`/store/${slug}/thanks?o=${result.order.id}`);
  }
  redirect(`/store?placed=1`);
}

export async function updateOrderStatusAction(
  orderId: string,
  patch: { paymentStatus?: string; orderStatus?: string }
) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).select("_id").lean();
  if (!vendor) return { ok: false as const, message: "Vendor not found" };

  const paymentStatus =
    patch.paymentStatus && PAYMENT_STATUSES.includes(patch.paymentStatus as PaymentStatus)
      ? (patch.paymentStatus as PaymentStatus)
      : undefined;
  const orderStatus =
    patch.orderStatus && ORDER_STATUSES.includes(patch.orderStatus as OrderStatus)
      ? (patch.orderStatus as OrderStatus)
      : undefined;

  if (!paymentStatus && !orderStatus) {
    return { ok: false as const, message: "Invalid status" };
  }

  if (orderStatus === "packed") {
    const existing = await getInvoiceForOrder(vendor._id, orderId);
    if (!existing) {
      const vendorFull = await Vendor.findById(vendor._id).select("businessId").lean();
      if (!vendorFull) return { ok: false as const, message: "Vendor not found" };
      const inv = await generateInvoiceForOrder(vendor._id, vendorFull.businessId, orderId);
      if (!inv.ok) return { ok: false as const, message: inv.reason };
    }
  }

  const res = await updateOrderStatus(vendor._id, orderId, { paymentStatus, orderStatus });
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${orderId}`);
  revalidatePath("/business/collections");
  return { ok: true as const };
}

export async function markOrderAsPackedAction(orderId: string) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId })
    .select("_id businessId")
    .lean();
  if (!vendor) return { ok: false as const, message: "Vendor not found" };

  const existing = await getInvoiceForOrder(vendor._id, orderId);
  if (!existing) {
    const inv = await generateInvoiceForOrder(vendor._id, vendor.businessId, orderId);
    if (!inv.ok) return { ok: false as const, message: inv.reason };
  }

  const res = await updateOrderStatus(vendor._id, orderId, { orderStatus: "packed" });
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${orderId}`);
  revalidatePath("/business/collections");
  return { ok: true as const };
}

export async function updateOrderItemsAction(
  orderId: string,
  updates: OrderItemQuantityUpdate[]
) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId }).select("_id").lean();
  if (!vendor) return { ok: false as const, message: "Vendor not found" };

  const res = await updateOrderItems(vendor._id, orderId, updates);
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${orderId}`);
  return { ok: true as const };
}

export async function createManualOrderAction(input: {
  buyerPhone: string;
  items: { productId: string; variantId?: string | null; quantity: number }[];
}) {
  const session = await requireRole("vendor");
  await connectDB();
  const vendor = await Vendor.findOne({ userId: session.userId })
    .select("_id businessId")
    .lean();
  if (!vendor) return { ok: false as const, message: "Vendor not found" };

  const phone = (input.buyerPhone ?? "").trim();
  if (!phone) return { ok: false as const, message: "Pick a buyer" };
  if (!input.items?.length) return { ok: false as const, message: "Add at least one item" };

  const buyer = await User.findOne({ role: "buyer", phone });
  if (!buyer) return { ok: false as const, message: "Buyer not found — invite them first" };

  const verified: {
    productId: string;
    variantId: string | null;
    variantLabel: string;
    name: string;
    price: number;
    quantity: number;
  }[] = [];
  for (const it of input.items) {
    if (!mongoose.isValidObjectId(it.productId)) {
      return { ok: false as const, message: "Invalid product in cart" };
    }
    if (!Number.isFinite(it.quantity) || it.quantity < 1) {
      return { ok: false as const, message: "Quantity must be at least 1" };
    }
    const fresh = await getProduct(vendor._id, it.productId);
    if (!fresh || fresh.status !== "active") {
      return { ok: false as const, message: "One of the products is unavailable" };
    }
    if (fresh.hasVariants) {
      const v = it.variantId ? fresh.variants.find((x) => x.id === it.variantId) : undefined;
      if (!v || v.status !== "active") {
        return { ok: false as const, message: `Pick an option for "${fresh.name}"` };
      }
      if (v.stock < it.quantity) {
        return {
          ok: false as const,
          message: `Only ${v.stock} of "${fresh.name} (${v.label})" in stock`,
        };
      }
      verified.push({
        productId: fresh.id,
        variantId: v.id,
        variantLabel: v.label,
        name: fresh.name,
        price: v.wholesalePrice,
        quantity: Math.floor(it.quantity),
      });
    } else {
      if (fresh.stock < it.quantity) {
        return {
          ok: false as const,
          message: `Only ${fresh.stock} of "${fresh.name}" in stock`,
        };
      }
      verified.push({
        productId: fresh.id,
        variantId: null,
        variantLabel: "",
        name: fresh.name,
        price: fresh.wholesalePrice,
        quantity: Math.floor(it.quantity),
      });
    }
  }

  const created = await createOrder({
    vendorId: vendor._id,
    businessId: vendor.businessId,
    buyerId: buyer._id,
    buyerName: buyer.name,
    buyerPhone: phone,
    items: verified,
  });
  if (!created.ok) return { ok: false as const, message: `Couldn't save order: ${created.reason}` };

  await decrementStocks(
    vendor._id,
    verified.map((v) => ({ id: v.productId, variantId: v.variantId, quantity: v.quantity }))
  ).catch(() => undefined);

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${created.order.id}`);
  revalidatePath("/business/products");
  return { ok: true as const, orderId: created.order.id };
}
