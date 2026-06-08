import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { signOut } from "@/app/(auth)/actions";

// ── Phone resolver (same pattern as site-header.tsx) ─────────────────────────
function resolvePhone(
  email: string | undefined,
  phone: string | undefined
): string | null {
  if (email?.endsWith("@dev.draply.local")) {
    const digits = email.split("@")[0] ?? "";
    if (digits && /^\d{10,15}$/.test(digits)) return "+" + digits;
    return null;
  }
  if (phone) {
    return phone.startsWith("+") ? phone : "+" + phone;
  }
  return null;
}

export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Auth: resolve Supabase session → Prisma user ──────────────────────────
  const supabase = createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let currentUser: { phone: string } | null = null;

  if (authUser) {
    const phone = resolvePhone(authUser.email, authUser.phone ?? undefined);
    if (phone) {
      currentUser = await prisma.user.findUnique({
        where: { phone },
        select: { phone: true },
      });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Merchant header strip ────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          {/* Wordmark */}
          <Link
            href="/merchant"
            className="text-xl font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
              Draply
            </span>{" "}
            <span className="text-zinc-700">Merchant</span>
          </Link>

          {/* Right side: phone + badge + sign-out */}
          <div className="flex items-center gap-2 sm:gap-3">
            {currentUser ? (
              <>
                <span className="hidden text-sm text-zinc-500 md:inline">
                  {currentUser.phone}
                </span>
                <Badge className="bg-rose-600 text-white hover:bg-rose-700">
                  MERCHANT
                </Badge>
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

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="max-w-5xl mx-auto px-4 py-6 w-full">{children}</main>
    </div>
  );
}
