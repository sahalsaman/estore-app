import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Business, type IBusiness } from "@/models/Business";

export type ResolvedStore = {
  businessId: string;
  slug: string;
  name: string;
  address?: string;
  phone?: string;
  business: IBusiness;
};

export const resolveStoreBySlug = cache(async (slug: string): Promise<ResolvedStore> => {
  await connectDB();
  const business = await Business.findOne({ slug, role: "seller", status: "active" }).lean();
  if (!business) notFound();
  return {
    businessId: business._id.toString(),
    slug: business.slug,
    name: business.name,
    address: business.address,
    phone: business.phone,
    business,
  };
});
