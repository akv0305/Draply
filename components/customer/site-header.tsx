import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { signOut } from "@/app/(auth)/actions";

// ── Phone resolver ────────────────────────────────────────────────────────────
// Synthetic email: "<digits>@dev.draply.local" → "+" + digits
// Real phone: prepend "+" if missing
// Returns null (falls back gracefully) if neither pattern matches.
function resolvePhone(
  email: string | undefined,
  phone: string | undefined
): string | null {
  if (email?.endsWith("@dev.draply.local")) {
    const digits = email.split("@")[0] ?? "";
    // digits should be "919900000001" → "+919900000001"
    if (digits && /^\d{10,15}$/.test(digits)) return "+" + digits;
    return null;
  }
  if (phone) {
    return phone.startsWith("+") ? phone : "+" + phone;
  }
  return null;
}

// ════════════════════════════════════════════════════════════════════════════
// SiteHeader — Server Component
// ════════════════════════════════════════════════════════════════════════════
export default async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let currentUser: { phone: string; role: string } | null = null;

  if (authUser) {
    const phone = resolvePhone(authUser.email, authUser.phone ?? undefined);
    if (phone) {
      currentUser = await prisma.user.findUnique({
        where: { phone },
        select: { phone: true, role: true },
      });
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* ── Wordmark ─────────────────────────────────────────────────────── */}
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
            Draply
          </span>
        </Link>

        {/* ── Auth area ────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          {currentUser ? (
            <>
              <span className="hidden text-sm text-zinc-500 sm:inline">
                {currentUser.phone}
              </span>
              <Badge variant="secondary">{currentUser.role}</Badge>
              <form action={signOut}>
                <Button variant="ghost" size="sm" type="submit">
                  Sign out
                </Button>
              </form>
            </>
          ) : (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
