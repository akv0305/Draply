import { defineConfig } from "prisma/config";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env" });

// DIRECT_URL  → aws-1-ap-south-1.pooler.supabase.com:5432  (session-mode, IPv4, used for db push / migrations)
// DATABASE_URL → aws-1-ap-south-1.pooler.supabase.com:6543  (transaction-mode pgbouncer, used by PrismaClient at runtime)
export default defineConfig({
  datasource: {
    url: process.env["DIRECT_URL"]!,
  },
});
