/**
 * Server-only helpers to read the current Supabase session
 * and the corresponding Prisma User row.
 *
 * Import ONLY in Server Components, Server Actions, and Route Handlers.
 */

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import type { User, UserRole } from "@prisma/client";

/** Returns the raw Supabase auth user, or null if unauthenticated. */
export async function getSupabaseUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the Prisma User row that corresponds to the current Supabase
 * session, or null if unauthenticated / no matching row.
 *
 * Supabase stores phone without the leading "+", so we normalise it.
 */
export async function getCurrentUser(): Promise<User | null> {
  const sbUser = await getSupabaseUser();
  if (!sbUser?.phone) return null;

  // Supabase omits the leading "+"; add it back if missing.
  const phone = sbUser.phone.startsWith("+")
    ? sbUser.phone
    : `+${sbUser.phone}`;

  return prisma.user.findUnique({ where: { phone } });
}

/**
 * Returns the current User or throws.
 * @throws "UNAUTHENTICATED" | "FORBIDDEN"
 */
export async function requireRole(roles: UserRole[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (!roles.includes(user.role)) throw new Error("FORBIDDEN");
  return user;
}
