/**
 * Dev-mode OTP shortcut.
 * When NEXT_PUBLIC_DEV_FIXED_OTP is set (e.g. "123456"), no SMS is sent
 * and that exact code is accepted for any phone number.
 * NEVER set this in production.
 */

export const DEV_FIXED_OTP = process.env.NEXT_PUBLIC_DEV_FIXED_OTP;

export const isDevAuthMode = (): boolean => Boolean(DEV_FIXED_OTP);
