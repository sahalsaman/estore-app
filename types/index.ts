import type { UserRole } from "@/lib/session";

export type { UserRole };

export type CartItem = {
  productId: string;
  variantId?: string;
  variantLabel?: string;
  vendorId: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
};

export type ActionResult<T = void> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string[]> };
