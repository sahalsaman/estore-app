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
