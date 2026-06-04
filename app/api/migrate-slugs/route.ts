import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { Business } from "@/models/Business";
import { uniqueBusinessSlug } from "@/lib/slug";

// One-shot backfill: assigns slugs to businesses that don't have one yet.
export async function GET() {
  await connectDB();
  const missing = await Business.find({ $or: [{ slug: { $exists: false } }, { slug: "" }] });
  const updated: { id: string; name: string; slug: string }[] = [];
  for (const b of missing) {
    const slug = await uniqueBusinessSlug(b.name, b._id.toString());
    b.slug = slug;
    await b.save();
    updated.push({ id: b._id.toString(), name: b.name, slug });
  }
  return NextResponse.json({ ok: true, updated });
}
