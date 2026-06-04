import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { connectDB } from "@/lib/db";
import { Business, type IBusiness } from "@/models/Business";
import { Vendor, type IVendor } from "@/models/Vendor";

export type ResolvedStore = {
  vendorId: string;
  businessId: string;
  slug: string;
  name: string;
  address?: string;
  phone?: string;
  vendor: IVendor;
  business: IBusiness;
};

export const resolveStoreBySlug = cache(async (slug: string): Promise<ResolvedStore> => {
  await connectDB();
  const business = await Business.findOne({ slug, status: "active" }).lean();
  if (!business) notFound();
  const vendor = await Vendor.findOne({ businessId: business._id, status: "active" }).lean();
  if (!vendor) notFound();
  return {
    vendorId: vendor._id.toString(),
    businessId: business._id.toString(),
    slug: business.slug,
    name: business.name,
    address: business.address,
    phone: business.phone,
    vendor,
    business,
  };
});
