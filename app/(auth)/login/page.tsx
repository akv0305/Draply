"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

import { sendOtp, verifyOtp } from "@/app/(auth)/actions";

const phoneSchema = z.object({
  phone: z
    .string()
    .min(10, "Enter your 10-digit mobile number")
    .regex(/^(\+?91)?\d{10}$/, "Enter your 10-digit mobile number"),
});
type PhoneForm = z.infer<typeof phoneSchema>;

const otpSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"),
});
type OtpForm = z.infer<typeof otpSchema>;

const DEV_OTP = process.env.NEXT_PUBLIC_DEV_FIXED_OTP;

function roleHome(role: string): string {
  if (role === "MERCHANT") return "/merchant";
  if (role === "ADMIN") return "/admin";
  return "/";
}

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [canonicalPhone, setCanonicalPhone] = useState("");
  const [isPending, startTransition] = useTransition();

  // ── Step 1: phone ─────────────────────────────────────────────────────────
  const phoneForm = useForm<PhoneForm>({
    resolver: zodResolver(phoneSchema),
    defaultValues: { phone: "" },
    mode: "onSubmit",
  });

  function handlePhoneSubmit(values: PhoneForm) {
    startTransition(async () => {
      const result = await sendOtp(values.phone);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      const digits = values.phone.replace(/\D/g, "").slice(-10);
      setCanonicalPhone("+91" + digits);
      setStep("otp");

      if (result.data.devMode) {
        toast.info(`Dev mode — enter OTP: ${DEV_OTP}`);
      } else {
        toast.success("OTP sent to your mobile");
      }
    });
  }

  // ── Step 2: OTP ───────────────────────────────────────────────────────────
  const otpForm = useForm<OtpForm>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
    mode: "onSubmit",
  });

  function handleOtpSubmit(values: OtpForm) {
    startTransition(async () => {
      const result = await verifyOtp(canonicalPhone, values.otp);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Signed in!");
      router.push(roleHome(result.data.role));
    });
  }

  return (
    <Card className="w-full max-w-sm shadow-lg">
      {DEV_OTP && (
        <div className="rounded-t-xl bg-amber-50 border-b border-amber-200 px-4 py-2 text-center text-xs text-amber-700 font-medium">
          🛠 DEV MODE — fixed OTP:{" "}
          <span className="font-mono font-bold">{DEV_OTP}</span>
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-xl">
          {step === "phone" ? "Enter your mobile number" : "Verify OTP"}
        </CardTitle>
        <CardDescription>
          {step === "phone"
            ? "We'll send a one-time password to your number."
            : `Enter the 6-digit code sent to ${canonicalPhone}.`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Step 1: Phone */}
        {step === "phone" && (
          <form
            onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="phone">Mobile number</Label>

              <div className="flex rounded-md border border-input ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden">
                <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground select-none border-r border-input shrink-0">
                  +91
                </span>
                <Controller
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <Input
                      id="phone"
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9900000001"
                      autoComplete="off"
                      className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 flex-1"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        // Strip anything that isn't a digit
                        const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 10);
                        field.onChange(digitsOnly);
                      }}
                      onBlur={field.onBlur}
                      name={field.name}
                      ref={field.ref}
                    />
                  )}
                />
              </div>

              {phoneForm.formState.errors.phone && (
                <p className="text-xs text-red-500">
                  {phoneForm.formState.errors.phone.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Sending…" : "Send OTP"}
            </Button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === "otp" && (
          <form
            onSubmit={otpForm.handleSubmit(handleOtpSubmit)}
            className="space-y-4"
            noValidate
          >
            <div className="space-y-1.5">
              <Label htmlFor="otp">One-time password</Label>
              <Controller
                control={otpForm.control}
                name="otp"
                render={({ field }) => (
                  <Input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="123456"
                    autoComplete="one-time-code"
                    className="tracking-widest text-center text-lg"
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\D/g, "").slice(0, 6);
                      field.onChange(digitsOnly);
                    }}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
                )}
              />
              {otpForm.formState.errors.otp && (
                <p className="text-xs text-red-500">
                  {otpForm.formState.errors.otp.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending}>
              {isPending ? "Verifying…" : "Verify & Sign in"}
            </Button>

            <button
              type="button"
              className="w-full text-sm text-zinc-500 hover:text-zinc-700 underline-offset-4 hover:underline"
              onClick={() => setStep("phone")}
            >
              ← Change number
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
