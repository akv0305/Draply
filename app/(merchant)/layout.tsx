import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";

/**
 * Merchant route group layout.
 * Allows MERCHANT and ADMIN roles; redirects anyone else to /login.
 */
export default async function MerchantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireRole(["MERCHANT", "ADMIN"]);
  } catch {
    redirect("/login");
  }
  return <>{children}</>;
}
