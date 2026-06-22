"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { ensureBuyer } from "@/services/buyers";
import { createSession } from "@/lib/session";

export type BuyerAuthState =
  | { error?: string; fieldErrors?: Record<string, string[]> }
  | undefined;

const RegisterSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Mobile number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  address: z.string().optional(),
});

const LoginSchema = z.object({
  phone: z.string().min(7, "Mobile number is required"),
  password: z.string().min(1, "Password required"),
});

// Buyers identify by phone. Registration also "claims" an anonymous buyer that
// was created at checkout (same phone, no password yet) by setting a password.
export async function buyerRegisterAction(_prev: BuyerAuthState, formData: FormData): Promise<BuyerAuthState> {
  const parsed = RegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { name, phone, password, address } = parsed.data;

  await connectDB();
  const existingAny = await User.findOne({ phone }).select("_id role password").lean();
  if (existingAny && existingAny.role !== "buyer") {
    return { error: "This phone number is already registered to another account." };
  }
  if (existingAny?.password) {
    return { error: "An account with this phone already exists — please sign in." };
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await ensureBuyer({ name, phone, address });
  await User.updateOne({ _id: user._id }, { $set: { password: hashed, name } });

  await createSession({
    userId: user._id.toString(),
    role: "buyer",
    businessId: user.businessId?.toString() ?? null,
    name,
  });
  redirect("/account");
}

export async function buyerLoginAction(_prev: BuyerAuthState, formData: FormData): Promise<BuyerAuthState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const { phone, password } = parsed.data;

  await connectDB();
  const user = await User.findOne({ role: "buyer", phone });
  if (!user || !user.password) {
    return { error: "Invalid phone or password. New here? Create an account." };
  }
  if (user.status === "disabled") return { error: "This account has been disabled." };

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return { error: "Invalid phone or password." };

  await createSession({
    userId: user._id.toString(),
    role: "buyer",
    businessId: user.businessId?.toString() ?? null,
    name: user.name,
  });
  redirect("/account");
}
