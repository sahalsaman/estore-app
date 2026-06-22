import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { readSession, type SessionPayload, type UserRole } from "./session";

export const verifySession = cache(async (): Promise<SessionPayload> => {
  const session = await readSession();
  if (!session?.userId) {
    redirect("/login");
  }
  return session;
});

export const requireRole = cache(async (...roles: UserRole[]): Promise<SessionPayload> => {
  const session = await verifySession();
  if (!roles.includes(session.role)) {
    redirect("/login");
  }
  return session;
});

export const getOptionalSession = cache(async () => readSession());

// Trust root for vendor (seller) scoping: the signed session carries the
// owner/team-member's businessId. Every seller-scoped query keys off this.
// Returns null when the vendor session has no business linked.
export const requireVendorBusinessId = cache(async (): Promise<string | null> => {
  const session = await requireRole("vendor");
  return session.businessId ?? null;
});
