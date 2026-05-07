"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { prisma } from "@/lib/db/prisma";
import { isDevAuthMode, DEV_FIXED_OTP } from "@/lib/auth/dev-otp";
import { ok, err, type Result } from "@/lib/utils/result";
import { redirect } from "next/navigation";

// ─────────────────────────────────────────────────────────────────────────────
// Phone normalisation
// Accepts: "9900000001" | "919900000001" | "+919900000001" | "+91 99000 00001"
// Returns: "+91XXXXXXXXXX" or null if unrecognisable.
// ─────────────────────────────────────────────────────────────────────────────
function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  let core: string;
  if (digits.length === 12 && digits.startsWith("91")) {
    core = digits.slice(2);
  } else if (digits.length === 10) {
    core = digits;
  } else {
    return null;
  }
  if (!/^\d{10}$/.test(core)) return null;
  return "+91" + core;
}

/**
 * Build a deterministic synthetic email from a canonical phone.
 * +919900000001 → 919900000001@dev.draply.local
 * Used in dev mode to leverage Supabase's email-based auth flow without SMS.
 */
function syntheticEmail(canonicalPhone: string): string {
  const digits = canonicalPhone.replace(/\D/g, "");
  return `${digits}@dev.draply.local`;
}

function getAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// sendOtp
// ─────────────────────────────────────────────────────────────────────────────
export async function sendOtp(
  rawPhone: string
): Promise<Result<{ devMode: boolean }>> {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return err("INVALID_PHONE", "Enter a valid 10-digit Indian mobile number");
  }

  if (isDevAuthMode()) {
    // No SMS sent. The fixed OTP will be accepted by verifyOtp.
    return ok({ devMode: true });
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) return err("OTP_SEND_FAILED", error.message);
  return ok({ devMode: false });
}

// ─────────────────────────────────────────────────────────────────────────────
// verifyOtp
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyOtp(
  rawPhone: string,
  otp: string
): Promise<Result<{ role: string }>> {
  const phone = normalizePhone(rawPhone);
  if (!phone) {
    return err("INVALID_PHONE", "Enter a valid 10-digit Indian mobile number");
  }
  if (!/^\d{6}$/.test(otp)) {
    return err("INVALID_OTP", "OTP must be exactly 6 digits");
  }

  // ── DEV MODE: synthetic-email magic-link flow (no SMS, no Twilio) ─────────
  if (isDevAuthMode()) {
    if (otp !== DEV_FIXED_OTP) {
      return err("BAD_OTP", `Wrong OTP. Dev hint: use ${DEV_FIXED_OTP}`);
    }

    const admin = getAdminClient();
    const email = syntheticEmail(phone);

    // Step 1: ensure auth user exists (idempotent).
    // Try to create; if "already registered", fetch existing.
    let authUserId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      phone, // store phone too for reference
      phone_confirm: true,
      user_metadata: { phone, dev_mode: true },
    });

    if (createErr) {
      const msg = createErr.message.toLowerCase();
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
        // Look up by email
        const { data: list, error: listErr } =
          await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        if (listErr) return err("AUTH_ADMIN_ERROR", listErr.message);
        const existing = list.users.find((u) => u.email === email);
        if (!existing) {
          return err("AUTH_ADMIN_ERROR", `User exists but lookup failed for ${email}`);
        }
        authUserId = existing.id;
      } else {
        return err("AUTH_ADMIN_ERROR", `createUser failed: ${createErr.message}`);
      }
    } else if (created?.user) {
      authUserId = created.user.id;
    }

    if (!authUserId) {
      return err("AUTH_ADMIN_ERROR", "Could not establish auth user id");
    }

    // Step 2: generate a magic link for this email.
    // We don't actually email it — we extract the token_hash and exchange it ourselves.
    const { data: linkData, error: linkErr } =
      await admin.auth.admin.generateLink({
        type: "magiclink",
        email,
      });

    if (linkErr || !linkData?.properties?.hashed_token) {
      return err(
        "AUTH_ADMIN_ERROR",
        `generateLink failed: ${linkErr?.message ?? "no hashed_token returned"}`
      );
    }

    // Step 3: exchange the token_hash for a session cookie via the user-scoped client.
    const supabase = createClient();
    const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
      type: "email",
      token_hash: linkData.properties.hashed_token,
    });

    if (verifyErr || !verifyData.user) {
      return err(
        "OTP_VERIFY_FAILED",
        `Session exchange failed: ${verifyErr?.message ?? "no user returned"}`
      );
    }

    // Step 4: bridge to Prisma User table.
    await upsertPrismaUser(phone);
    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user) {
      return err("PRISMA_USER_MISSING", "User row not found after upsert");
    }
    return ok({ role: user.role });
  }

  // ── PROD MODE: real SMS OTP via Supabase + Twilio ─────────────────────────
  const supabase = createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token: otp,
    type: "sms",
  });
  if (error || !data.user) {
    return err("OTP_VERIFY_FAILED", error?.message ?? "Verification failed");
  }

  await upsertPrismaUser(phone);
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) return err("PRISMA_USER_MISSING", "User row not found after upsert");
  return ok({ role: user.role });
}

// ─────────────────────────────────────────────────────────────────────────────
// signOut
// ─────────────────────────────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helpers
// ─────────────────────────────────────────────────────────────────────────────
async function upsertPrismaUser(phone: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (!existing) {
    await prisma.user.create({ data: { phone, role: "CUSTOMER" } });
  }
}
