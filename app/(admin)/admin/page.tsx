import { requireRole } from "@/lib/auth/session";

export default async function AdminHomePage() {
  const user = await requireRole(["ADMIN"]);

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
      <p className="text-zinc-500 mb-4">
        Logged in as {user.name ?? user.phone} · role: {user.role}
      </p>
      <p className="text-sm text-zinc-400">
        Full admin panel coming in a future prompt.
      </p>
    </main>
  );
}
