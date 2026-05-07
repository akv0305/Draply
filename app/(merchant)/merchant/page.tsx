import { requireRole } from "@/lib/auth/session";

export default async function MerchantHomePage() {
  const user = await requireRole(["MERCHANT", "ADMIN"]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-2">Merchant Dashboard</h1>
      <p className="text-zinc-500 mb-4">
        Welcome back, {user.name ?? user.phone}.
      </p>
      <p className="text-sm text-zinc-400">
        Full dashboard coming in the next prompt.
      </p>
    </main>
  );
}
