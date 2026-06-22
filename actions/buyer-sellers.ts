"use server";

import { revalidatePath } from "next/cache";
import mongoose from "mongoose";

import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { requireRole } from "@/lib/dal";
import { getBuyerProfile, listBuyerSellers } from "@/services/buyer-portal";
import { upsertBuyerInvite } from "@/services/buyer-invites";

export type SellerSearchResult = {
  businessId: string;
  name: string;
  slug: string;
  connected: boolean;
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Buyer searches active seller stores by name or slug. Marks the ones they're
// already connected to (have ordered from or already connected).
export async function searchSellersAction(query: string): Promise<SellerSearchResult[]> {
  const session = await requireRole("buyer");
  const q = (query ?? "").trim();
  if (q.length < 1) return [];

  const profile = await getBuyerProfile(session.userId);
  await connectDB();
  const rx = new RegExp(escapeRegex(q), "i");
  const sellers = await Business.find({
    role: "seller",
    status: "active",
    $or: [{ name: rx }, { slug: rx }],
  })
    .select("name slug")
    .sort({ name: 1 })
    .limit(10)
    .lean();

  const connectedIds = new Set((await listBuyerSellers(profile?.phone ?? "")).map((s) => s.businessId));
  return sellers.map((b) => ({
    businessId: b._id.toString(),
    name: b.name,
    slug: b.slug ?? "",
    connected: connectedIds.has(b._id.toString()),
  }));
}

// Connect the buyer to a seller (idempotent). Creates the buyer↔seller link so
// the seller appears in the buyer's seller list and the buyer in the seller's.
export async function connectSellerAction(businessId: string) {
  const session = await requireRole("buyer");
  if (!mongoose.isValidObjectId(businessId)) return { ok: false as const, message: "Invalid seller" };

  const profile = await getBuyerProfile(session.userId);
  if (!profile?.phone) return { ok: false as const, message: "Buyer profile not found" };

  await connectDB();
  const seller = await Business.findOne({ _id: businessId, role: "seller", status: "active" })
    .select("name")
    .lean();
  if (!seller) return { ok: false as const, message: "Seller not available" };

  const res = await upsertBuyerInvite(
    { businessId },
    { buyerName: profile.name, buyerPhone: profile.phone, buyerId: profile.id }
  );
  if (!res.ok) return { ok: false as const, message: res.reason };

  revalidatePath("/account/sellers");
  return { ok: true as const, message: `Connected to ${seller.name}` };
}
