import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import { User } from "@/models/User";

// One-shot endpoint to bootstrap the first admin.
// Visit GET /api/seed-admin?email=...&password=...&name=... — refuses if an admin already exists.
export async function GET(req: Request) {
  await connectDB();
  const existing = await User.findOne({ role: "admin" });
  if (existing) {
    return NextResponse.json({ ok: false, message: "An admin already exists." }, { status: 409 });
  }

  const url = new URL(req.url);
  const email = url.searchParams.get("email") ?? "admin@order.store";
  const password = url.searchParams.get("password") ?? "admin1234";
  const name = url.searchParams.get("name") ?? "Platform Admin";

  const hashed = await bcrypt.hash(password, 10);
  await User.create({ name, email, password: hashed, role: "admin" });

  return NextResponse.json({
    ok: true,
    message: "Admin created. Sign in at /login.",
    credentials: { email, password },
  });
}
