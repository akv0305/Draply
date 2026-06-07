"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ── Nav item type ─────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  emoji: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Home",   href: "/",       emoji: "🏠" },
  { label: "Shop",   href: "/shop",   emoji: "🛍️" },
  { label: "Cart",   href: "/cart",   emoji: "🛒" },
  { label: "Orders", href: "/orders", emoji: "📦" },
];

// ── Active check ──────────────────────────────────────────────────────────────
// "/" is active only when pathname === "/"
// others active when pathname === href OR pathname starts with href + "/"
function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

// ════════════════════════════════════════════════════════════════════════════
// BottomNav — Client Component
// ════════════════════════════════════════════════════════════════════════════
export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white md:hidden">
      <div className="mx-auto grid max-w-6xl grid-cols-4">
        {NAV_ITEMS.map(({ label, href, emoji }) => {
          const active = isActive(href, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-xs ${
                active ? "text-rose-500" : "text-zinc-500"
              }`}
            >
              <span className="text-xl leading-none">{emoji}</span>
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
