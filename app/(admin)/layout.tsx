import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

/**
 * Admin route group layout.
 * Allows ADMIN role only; redirects anyone else to /login.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["ADMIN"]);
  } catch {
    redirect("/login");
  }
  return <>{children}</>;
}
