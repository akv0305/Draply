import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Draply",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-50 px-4">
      {/* Brand mark */}
      <a
        href="/"
        className="mb-8 text-2xl font-bold tracking-tight text-zinc-900 select-none"
      >
        Draply
      </a>
      {children}
    </div>
  );
}
