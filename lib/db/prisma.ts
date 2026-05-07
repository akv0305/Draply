import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 uses the new "client" query engine which requires a driver adapter.
// PrismaPg wraps the standard `pg` pool and satisfies the adapter interface.
// DATABASE_URL is read from process.env (loaded by Next.js from .env.local at runtime,
// or from .env when running scripts with --env-file=.env).
function makeClient() {
  const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};
export const prisma = globalForPrisma.prisma ?? makeClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
