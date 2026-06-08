import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/db/prisma";
import { signOut } from "@/app/(auth)/actions";

// ── Phone resolver (same pattern as site-header.tsx / merchant layout) ────────
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

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── Auth: resolve Supabase session → Prisma user ──────────────────────────
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

  // ── Auth guard: must be logged in AND be ADMIN ────────────────────────────
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* ── Admin header strip ────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* Wordmark */}
          <Link
            href="/admin"
            className="text-xl font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-rose-500 to-amber-500 bg-clip-text text-transparent">
              Draply
            </span>{" "}
            <span className="text-zinc-700">Admin</span>
          </Link>

          {/* Right side: phone + ADMIN badge + sign-out */}
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden text-sm text-zinc-500 md:inline">
              {currentUser.phone}
            </span>
            <Badge className="bg-violet-600 text-white hover:bg-violet-700">
              ADMIN
            </Badge>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-4 py-6 w-full">{children}</main>
    </div>
  );
}
