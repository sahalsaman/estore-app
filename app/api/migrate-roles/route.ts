import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";

// One-shot backfill for the Vendor/Buyer-table removal: every Business that
// predates the `role` field was a seller shop, so mark anything not explicitly
// a buyer as "seller". Buyer businesses (created at checkout) already set role.
export async function GET() {
  await connectDB();
  const res = await Business.updateMany(
    { role: { $ne: "buyer" } },
    { $set: { role: "seller" } }
  );
  return NextResponse.json({ ok: true, matched: res.matchedCount, modified: res.modifiedCount });
}
