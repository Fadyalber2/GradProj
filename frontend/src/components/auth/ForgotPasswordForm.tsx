"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type RecoveryMethod = "email" | "phone";
type PhoneStep = "phone" | "code";

const panelClass =
  "rounded-[1.25rem] border border-white/10 bg-[#151515] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-10";
const labelClass =
  "mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-white/42";
const inputClass =
  "auth-field block w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-sm text-white placeholder:text-white/28 outline-none transition-[border-color,background-color,box-shadow] duration-150 focus:border-primary/70 focus:bg-[#121212] focus:shadow-[0_0_0_3px_rgba(255,90,60,0.12)]";
const RECOVERY_SESSION_KEY = "axiom:password-recovery";

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [method, setMethod] = useState<RecoveryMethod>("email");
  const [emailLoading, setEmailLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");

  async function handleEmailSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailLoading(true);

    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(error.message);
      setEmailSent(true);
      toast.success("Reset link sent. Check your email.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not send reset link.";
      toast.error(msg);
    } finally {
      setEmailLoading(false);
    }
  }

  async function handlePhoneSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nextPhone = normalizePhone(phone);
    setPhoneError("");

    if (!/^\+[1-9]\d{7,14}$/.test(nextPhone)) {
      setPhoneError("Enter the phone in E.164 format, for example +201001234567.");
      return;
    }

    setPhoneLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: nextPhone,
        options: { shouldCreateUser: false },
      });
      if (error) throw new Error(error.message);
      setPhone(nextPhone);
      setPhoneStep("code");
      toast.success("Verification code sent.");
    } catch (err) {
      setPhoneError(
        err instanceof Error
          ? err.message
          : "Could not send code. Make sure this phone is linked to your account.",
      );
    } finally {
      setPhoneLoading(false);
    }
  }

  async function handleCodeSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = code.replace(/\D/g, "").slice(0, 6);
    setPhoneError("");

    if (token.length !== 6) {
      setPhoneError("Enter the 6-digit code.");
      return;
    }

    setPhoneLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token,
        type: "sms",
      });
      if (error) throw new Error(error.message);
      window.sessionStorage.setItem(RECOVERY_SESSION_KEY, "phone");
      toast.success("Phone verified. Set a new password.");
      router.push("/reset-password");
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Invalid or expired code.");
      setCode("");
    } finally {
      setPhoneLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      <div className={panelClass}>
        <div className="mb-7 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
            <KeyRound className="h-7 w-7 text-primary" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-primary">
            Account recovery
          </p>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-white">
            Reset your password
          </h1>
          <p className="mt-3 text-sm leading-6 text-white/50">
            Use your email reset link or verify a phone number already linked to your AXIOM account.
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.035] p-1">
          {(
            [
              ["email", Mail, "Email"],
              ["phone", Phone, "Phone"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-[background-color,color,transform] duration-150 active:scale-[0.98] ${
                method === value
                  ? "bg-primary text-white"
                  : "text-white/52 hover:bg-white/[0.05] hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {method === "email" ? (
          emailSent ? (
            <div className="py-3 text-center">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-300" />
              </div>
              <h2 className="text-xl font-black text-white">Check your email</h2>
              <p className="mt-2 text-sm leading-6 text-white/50">
                If an AXIOM account exists for that email, a reset link will arrive shortly.
              </p>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleEmailSubmit}>
              <div>
                <label htmlFor="email" className={labelClass}>
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>

              <button
                type="submit"
                disabled={emailLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,90,60,0.18)] transition-[background-color,transform,opacity] duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {emailLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {emailLoading ? "Sending..." : "Send reset link"}
              </button>
            </form>
          )
        ) : phoneStep === "phone" ? (
          <form className="space-y-5" onSubmit={handlePhoneSubmit}>
            <div>
              <label htmlFor="phone" className={labelClass}>
                Phone number
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                inputMode="tel"
                required
                placeholder="+201001234567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
              />
              <p className="mt-2 text-xs leading-5 text-white/36">
                Phone recovery only works after the number is linked to your Supabase Auth account.
              </p>
            </div>

            {phoneError && (
              <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                {phoneError}
              </p>
            )}

            <button
              type="submit"
              disabled={phoneLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,90,60,0.18)] transition-[background-color,transform,opacity] duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phoneLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {phoneLoading ? "Sending..." : "Send phone code"}
            </button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleCodeSubmit}>
            <div>
              <label htmlFor="code" className={labelClass}>
                Verification code
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${inputClass} text-center font-mono text-lg tracking-[0.35em]`}
              />
              <p className="mt-2 text-xs leading-5 text-white/36">
                Enter the code sent to {phone}.
              </p>
            </div>

            {phoneError && (
              <p className="rounded-lg border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-200">
                {phoneError}
              </p>
            )}

            <button
              type="submit"
              disabled={phoneLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3.5 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,90,60,0.18)] transition-[background-color,transform,opacity] duration-150 hover:bg-primary-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phoneLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {phoneLoading ? "Verifying..." : "Set new password"}
            </button>

            <button
              type="button"
              onClick={() => {
                setPhoneStep("phone");
                setCode("");
                setPhoneError("");
              }}
              className="w-full text-sm font-bold text-white/48 transition-colors hover:text-white"
            >
              Change phone number
            </button>
          </form>
        )}

        <div className="mt-8 border-t border-white/10 pt-6 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-primary underline-offset-4 transition-colors hover:text-primary-hover hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to login
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
