// server-only helper — do NOT import in Client Components
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";

/**
 * Returns the Prisma User row for the currently authenticated session,
 * or null if not signed in / user not found.
 *
 * Phone resolution:
 *   - Dev mode: email is "<digits>@dev.draply.local" → phone = "+" + digits
 *   - Prod mode: authUser.phone (prepend "+" if missing)
 */
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  let phone: string | null = null;
  if (authUser.email?.endsWith("@dev.draply.local")) {
    const digits = authUser.email.split("@")[0] ?? "";
    if (digits) phone = "+" + digits;
  } else if (authUser.phone) {
    phone = authUser.phone.startsWith("+")
      ? authUser.phone
      : "+" + authUser.phone;
  }

  if (!phone) return null;

  return prisma.user.findUnique({ where: { phone } });
}
