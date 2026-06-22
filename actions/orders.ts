"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import mongoose from "mongoose";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { ensureBuyer } from "@/services/buyers";
import { decrementStocks, getProduct } from "@/services/products";
import {
  createOrder,
  updateOrderItems,
  updateOrderStatus,
  type OrderItemQuantityUpdate,
} from "@/services/orders";
import { generateInvoiceForOrder, getInvoiceForOrder } from "@/services/invoices";
import type { OrderStatus, PaymentStatus } from "@/models/Order";
import { requireRole, requireVendorBusinessId } from "@/lib/dal";
import { getBuyerProfile } from "@/services/buyer-portal";
import { User } from "@/models/User";
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

type Cart = { businessId: string | null; items: CartItem[] };

async function readCart(): Promise<Cart> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;
  if (!raw) return { businessId: null, items: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.items)) return parsed as Cart;
    return { businessId: null, items: [] };
  } catch {
    return { businessId: null, items: [] };
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

export async function getCartForBusiness(businessId: string): Promise<CartItem[]> {
  const cart = await readCart();
  if (cart.businessId !== businessId) return [];
  return cart.items;
}

// The whole cart, regardless of which store it belongs to. Used by the buyer
// module (/account/cart) where the buyer isn't on a specific store page.
export async function getCart(): Promise<Cart> {
  return readCart();
}

async function slugForBusiness(businessId: string): Promise<string | null> {
  const business = await Business.findById(businessId).select("slug").lean();
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
  businessId: string,
  productId: string,
  lines: { variantId?: string | null; quantity: number }[]
): Promise<{ ok: true; items: CartItem[] } | { ok: false; message: string }> {
  const product = await getProduct(businessId, productId);
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
        businessId,
        name: product.name,
        price: v.wholesalePrice,
        image: v.image ?? product.images[0],
        quantity: qty,
      });
    } else {
      if (product.stock <= 0) return { ok: false, message: "Out of stock" };
      items.push({
        productId,
        businessId,
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
  businessIdHint: string,
  productId: string,
  lines: { variantId?: string | null; quantity: number }[]
) {
  if (!mongoose.isValidObjectId(businessIdHint)) return { ok: false as const, message: "Invalid store" };
  await connectDB();
  const business = await Business.findOne({ _id: businessIdHint, role: "seller" });
  if (!business || business.status !== "active") return { ok: false as const, message: "Store unavailable" };

  const businessId = business._id.toString();
  const resolved = await resolveCartLines(businessId, productId, lines);
  if (!resolved.ok) return { ok: false as const, message: resolved.message };

  let cart = await readCart();
  let switched = false;
  if (cart.businessId && cart.businessId !== businessId && cart.items.length > 0) {
    cart = { businessId, items: [] };
    switched = true;
  } else {
    cart.businessId = businessId;
  }

  for (const item of resolved.items) {
    const existing = cart.items.find((c) => sameLine(c, item.productId, item.variantId));
    if (existing) existing.quantity += item.quantity;
    else cart.items.push(item);
  }

  await writeCart(cart);
  const slug = await slugForBusiness(businessId);
  if (slug) {
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/cart`);
    revalidatePath(`/account/store/${slug}`);
  }
  revalidatePath("/account/cart");
  return { ok: true as const, count: cart.items.reduce((s, c) => s + c.quantity, 0), switched };
}

export async function addToCartAction(
  productId: string,
  businessIdHint: string,
  quantity = 1,
  variantId?: string
) {
  return addLinesToCart(businessIdHint, productId, [{ variantId, quantity }]);
}

export async function addVariantsToCartAction(
  productId: string,
  businessIdHint: string,
  lines: { variantId: string; quantity: number }[]
) {
  const wanted = (lines ?? []).filter((l) => l.quantity > 0);
  if (wanted.length === 0) return { ok: false as const, message: "Enter a quantity for at least one option" };
  return addLinesToCart(businessIdHint, productId, wanted);
}

export async function updateCartItemAction(
  productId: string,
  quantity: number,
  variantId?: string
) {
  const cart = await readCart();
  const next: Cart = {
    businessId: cart.businessId,
    items:
      quantity <= 0
        ? cart.items.filter((c) => !sameLine(c, productId, variantId))
        : cart.items.map((c) => (sameLine(c, productId, variantId) ? { ...c, quantity } : c)),
  };
  if (next.items.length === 0) next.businessId = null;
  await writeCart(next);
  revalidatePath("/account/cart");
  if (cart.businessId) {
    const slug = await slugForBusiness(cart.businessId);
    if (slug) revalidatePath(`/store/${slug}/cart`);
  }
  return { ok: true as const };
}

export async function removeFromCartAction(productId: string, variantId?: string) {
  const cart = await readCart();
  const items = cart.items.filter((c) => !sameLine(c, productId, variantId));
  await writeCart({ businessId: items.length ? cart.businessId : null, items });
  revalidatePath("/account/cart");
  if (cart.businessId) {
    const slug = await slugForBusiness(cart.businessId);
    if (slug) revalidatePath(`/store/${slug}/cart`);
  }
  return { ok: true as const };
}

const CheckoutSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Mobile number is required"),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type CheckoutState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

type VerifiedLine = {
  productId: string;
  variantId: string | null;
  variantLabel: string;
  name: string;
  price: number;
  quantity: number;
};

// Re-check every cart line against fresh product/variant data at checkout time:
// availability, the chosen variant, and stock. Returns the trustworthy lines or
// the first problem found.
async function verifyCartItems(
  businessId: string,
  items: CartItem[]
): Promise<{ ok: true; verified: VerifiedLine[] } | { ok: false; error: string }> {
  const verified: VerifiedLine[] = [];
  for (const item of items) {
    const fresh = await getProduct(businessId, item.productId);
    if (!fresh || fresh.status !== "active") {
      return { ok: false, error: `"${item.name}" is no longer available` };
    }
    if (fresh.hasVariants) {
      const v = item.variantId ? fresh.variants.find((x) => x.id === item.variantId) : undefined;
      if (!v || v.status !== "active") {
        return { ok: false, error: `An option of "${fresh.name}" is no longer available` };
      }
      if (v.stock < item.quantity) {
        return { ok: false, error: `Only ${v.stock} of "${fresh.name} (${v.label})" in stock` };
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
        return { ok: false, error: `Only ${fresh.stock} of "${fresh.name}" in stock` };
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
  return { ok: true, verified };
}

export async function placeOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const parsed = CheckoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }
  const { businessId, name, phone, address } = parsed.data;
  if (!mongoose.isValidObjectId(businessId)) return { error: "Invalid store" };

  const cart = await readCart();
  if (cart.businessId !== businessId || cart.items.length === 0) {
    return { error: "Your cart is empty" };
  }

  await connectDB();
  const business = await Business.findOne({ _id: businessId, role: "seller" });
  if (!business || business.status !== "active") return { error: "Store is unavailable" };
  const slug = business.slug;

  const check = await verifyCartItems(businessId, cart.items);
  if (!check.ok) return { error: check.error };
  const verified = check.verified;

  const buyer = await ensureBuyer({ name, phone, address });

  const result = await createOrder({
    businessId,
    buyerId: buyer._id,
    buyerName: name,
    buyerPhone: phone,
    items: verified,
  });
  if (!result.ok) {
    return { error: `Couldn't save the order: ${result.reason}` };
  }

  await decrementStocks(
    businessId,
    verified.map((v) => ({ id: v.productId, variantId: v.variantId, quantity: v.quantity }))
  ).catch(() => undefined);

  await writeCart({ businessId: null, items: [] });
  if (slug) {
    revalidatePath(`/store/${slug}`);
    revalidatePath(`/store/${slug}/cart`);
    redirect(`/store/${slug}/thanks?o=${result.order.id}`);
  }
  redirect(`/store?placed=1`);
}

const BuyerCheckoutSchema = z.object({
  address: z.string().optional(),
  notes: z.string().optional(),
});

// Checkout from inside the buyer module (/account/cart). The buyer is signed in,
// so name/phone come from the session/profile rather than a form — they only
// confirm a delivery address. Redirects to the placed order on success.
export async function placeBuyerOrderAction(_prev: CheckoutState, formData: FormData): Promise<CheckoutState> {
  const session = await requireRole("buyer");
  const parsed = BuyerCheckoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  const profile = await getBuyerProfile(session.userId);
  if (!profile?.phone) return { error: "Your buyer profile is incomplete" };

  const cart = await readCart();
  if (!cart.businessId || cart.items.length === 0) {
    return { error: "Your cart is empty" };
  }

  await connectDB();
  const business = await Business.findOne({ _id: cart.businessId, role: "seller" });
  if (!business || business.status !== "active") return { error: "Store is unavailable" };

  const check = await verifyCartItems(cart.businessId, cart.items);
  if (!check.ok) return { error: check.error };
  const verified = check.verified;

  const address = parsed.data.address?.trim() || profile.address || undefined;
  const buyer = await ensureBuyer({ name: profile.name, phone: profile.phone, address });

  const result = await createOrder({
    businessId: cart.businessId,
    buyerId: buyer._id,
    buyerName: profile.name,
    buyerPhone: profile.phone,
    items: verified,
  });
  if (!result.ok) {
    return { error: `Couldn't save the order: ${result.reason}` };
  }

  await decrementStocks(
    cart.businessId,
    verified.map((v) => ({ id: v.productId, variantId: v.variantId, quantity: v.quantity }))
  ).catch(() => undefined);

  await writeCart({ businessId: null, items: [] });
  if (business.slug) {
    revalidatePath(`/store/${business.slug}`);
    revalidatePath(`/store/${business.slug}/cart`);
  }
  revalidatePath("/account/cart");
  revalidatePath("/account/orders");
  revalidatePath("/account");
  redirect(`/account/orders/${result.order.id}`);
}

export async function updateOrderStatusAction(
  orderId: string,
  patch: { paymentStatus?: string; orderStatus?: string }
) {
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };
  await connectDB();

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
    const existing = await getInvoiceForOrder(businessId, orderId);
    if (!existing) {
      const inv = await generateInvoiceForOrder(businessId, orderId);
      if (!inv.ok) return { ok: false as const, message: inv.reason };
    }
  }

  const res = await updateOrderStatus(businessId, orderId, { paymentStatus, orderStatus });
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${orderId}`);
  revalidatePath("/business/collections");
  return { ok: true as const };
}

export async function markOrderAsPackedAction(orderId: string) {
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };
  await connectDB();

  const existing = await getInvoiceForOrder(businessId, orderId);
  if (!existing) {
    const inv = await generateInvoiceForOrder(businessId, orderId);
    if (!inv.ok) return { ok: false as const, message: inv.reason };
  }

  const res = await updateOrderStatus(businessId, orderId, { orderStatus: "packed" });
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
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };
  await connectDB();

  const res = await updateOrderItems(businessId, orderId, updates);
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${orderId}`);
  return { ok: true as const };
}

export async function createManualOrderAction(input: {
  buyerPhone: string;
  items: { productId: string; variantId?: string | null; quantity: number }[];
}) {
  const businessId = await requireVendorBusinessId();
  if (!businessId) return { ok: false as const, message: "No business linked" };
  await connectDB();

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
    const fresh = await getProduct(businessId, it.productId);
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
    businessId,
    buyerId: buyer._id,
    buyerName: buyer.name,
    buyerPhone: phone,
    items: verified,
  });
  if (!created.ok) return { ok: false as const, message: `Couldn't save order: ${created.reason}` };

  await decrementStocks(
    businessId,
    verified.map((v) => ({ id: v.productId, variantId: v.variantId, quantity: v.quantity }))
  ).catch(() => undefined);

  revalidatePath("/business/orders");
  revalidatePath(`/business/orders/${created.order.id}`);
  revalidatePath("/business/products");
  return { ok: true as const, orderId: created.order.id };
}
