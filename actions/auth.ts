"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { connectDB } from "@/lib/db";
import { User } from "@/models/User";
import { Business } from "@/models/Business";
import { Vendor } from "@/models/Vendor";
import { createSession, deleteSession } from "@/lib/session";
import { uniqueBusinessSlug } from "@/lib/slug";

const VendorSignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  businessName: z.string().min(2, "Business name is required"),
  phone: z.string().min(7, "Phone is required"),
  address: z.string().optional(),
});

const LoginSchema = z.object({
  identifier: z.string().min(3, "Email or phone required"),
  password: z.string().min(1, "Password required"),
});

export type AuthState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
} | undefined;

export async function vendorSignupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = VendorSignupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  await connectDB();
  const { name, email, password, businessName, phone, address } = parsed.data;

  const existing = await User.findOne({ email });
  if (existing) return { error: "An account with this email already exists" };

  const hashed = await bcrypt.hash(password, 10);

  const user = await User.create({ name, email, password: hashed, role: "vendor" });
  const slug = await uniqueBusinessSlug(businessName);
  const business = await Business.create({ name: businessName, slug, phone, address, ownerId: user._id });
  user.businessId = business._id;
  await user.save();
  await Vendor.create({ userId: user._id, businessId: business._id });

  await createSession({
    userId: user._id.toString(),
    role: "vendor",
    businessId: business._id.toString(),
    name: user.name,
  });

  redirect("/business");
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: z.flattenError(parsed.error).fieldErrors };
  }

  await connectDB();
  const { identifier, password } = parsed.data;

  const user = await User.findOne({
    role: { $in: ["admin", "vendor"] },
    $or: [{ email: identifier.toLowerCase() }, { phone: identifier }],
  });
  if (!user || !user.password) return { error: "Invalid credentials" };

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return { error: "Invalid credentials" };

  await createSession({
    userId: user._id.toString(),
    role: user.role,
    businessId: user.businessId?.toString() ?? null,
    name: user.name,
  });

  if (user.role === "admin") redirect("/admin");
  redirect("/business");
}

export async function logoutAction() {
  await deleteSession();
  revalidatePath("/");
  redirect("/login");
}
