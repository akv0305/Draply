import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { signOut } from "@/app/(auth)/actions";
import { getCartSummary } from "@/lib/cart/get-cart-summary";

// ── Phone resolver ────────────────────────────────────────────────────────────
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

  // Fetch cart count only when logged in (avoids unnecessary DB hit otherwise)
  const cartCount = currentUser ? (await getCartSummary()).itemCount : 0;

  return (
    <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        {/* Wordmark */}
        <Link href="/" className="text-2xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
            Draply
          </span>
        </Link>

        {/* Right side: cart + auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {currentUser && (
            <>
              {/* Cart link — visible on all screens */}
              <Link
                href="/cart"
                className="relative inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
                aria-label="Cart"
              >
                <span className="text-xl">🛒</span>
                <span className="hidden sm:inline">Cart</span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Orders link — desktop only */}
              <Link
                href="/orders"
                className="hidden items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 sm:inline-flex"
                aria-label="Orders"
              >
                <span className="text-lg">📦</span>
                <span>Orders</span>
              </Link>
            </>
          )}

          {currentUser ? (
            <>
              <span className="hidden text-sm text-zinc-500 md:inline">
                {currentUser.phone}
              </span>
              <Badge variant="secondary" className="hidden sm:inline-flex">
                {currentUser.role}
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
  );
}
