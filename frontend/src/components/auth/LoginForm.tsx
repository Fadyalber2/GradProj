"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { ArrowRight, Eye, EyeOff, Loader2, Mail, Phone, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import OAuthButton from "@/components/auth/OAuthButton";
import { GoogleIcon, FacebookIcon } from "@/components/auth/OAuthIcons";

type LoginMethod = "email" | "phone";
type PhoneStep = "phone" | "code";

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "").trim();
}

export default function LoginForm() {
  const router = useRouter();
  const { login, sendPhoneOtp, verifyPhoneOtp, isLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [method, setMethod] = useState<LoginMethod>("email");
  const [phoneStep, setPhoneStep] = useState<PhoneStep>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const email = (fd.get("email") as string).trim();
    const password = fd.get("password") as string;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      await login(email, password);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const nextPhone = normalizePhone(phone);
    if (!/^\+[1-9]\d{7,14}$/.test(nextPhone)) {
      setError("Enter your phone in E.164 format, for example +201001234567.");
      return;
    }

    try {
      await sendPhoneOtp(nextPhone);
      setPhone(nextPhone);
      setPhoneStep("code");
      toast.success("Verification code sent.");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Could not send phone code. Make sure this number is linked to your account.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const token = otp.replace(/\D/g, "").slice(0, 6);
    if (token.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }

    try {
      await verifyPhoneOtp(phone, token);
      toast.success("Welcome back!");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or expired code.";
      setError(msg);
      setOtp("");
      toast.error(msg);
    }
  };

  const inputClass =
    "auth-field block w-full rounded-lg border border-white/10 bg-[#101010] px-4 py-3 text-white caret-primary placeholder:text-white/30 transition-[border-color,box-shadow,background-color] duration-150 ease-out focus:border-primary/70 focus:bg-[#121212] focus:outline-none focus:ring-2 focus:ring-primary/30 sm:text-sm";
  const labelClass =
    "mb-1.5 block text-xs font-semibold uppercase tracking-[0.18em] text-white/50";
  const iconButtonClass =
    "absolute inset-y-0 right-0 flex items-center px-3 text-white/40 transition-[color,transform] duration-150 ease-out hover:text-white active:scale-95";

  return (
    <motion.div
      initial={{ opacity: 0, transform: "translateY(14px)" }}
      animate={{ opacity: 1, transform: "translateY(0)" }}
      transition={{ duration: 0.28, ease: [0.23, 1, 0.32, 1] }}
      className="w-full justify-self-center lg:justify-self-end"
    >
      <div className="mx-auto w-full max-w-xl rounded-lg border border-white/10 bg-[#171717]/95 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.42)] sm:p-7">
        <div className="mb-7 flex items-start justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-primary">
              AXIOM
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Sign in to open your dashboard, listings, and saved homes.
            </p>
          </div>
          <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-300/20 bg-emerald-300/10 text-emerald-200 sm:flex">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mb-5 grid grid-cols-2 rounded-xl border border-white/10 bg-white/[0.035] p-1">
          {(
            [
              ["email", Mail, "Email"],
              ["phone", Phone, "Phone"],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setMethod(value);
                setError(null);
              }}
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
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className={labelClass}>
                Email Address
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

            <div>
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="Password"
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className={iconButtonClass}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="custom-checkbox h-4 w-4"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block cursor-pointer text-sm text-white/50 transition-colors duration-150 hover:text-white"
                >
                  Remember Me
                </label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-primary transition-colors duration-150 hover:text-primary-hover"
              >
                Forgot Password?
              </Link>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,90,60,0.22)] transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLoading ? "Signing in..." : "Log In"}
                {!isLoading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
              </button>
            </div>
          </form>
        ) : phoneStep === "phone" ? (
          <form onSubmit={handlePhoneSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-phone" className={labelClass}>
                Phone Number
              </label>
              <input
                id="login-phone"
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
              <p className="mt-2 text-xs leading-5 text-white/38">
                Phone sign-in works only for numbers linked to your AXIOM account.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,90,60,0.22)] transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Sending..." : "Send code"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-code" className={labelClass}>
                Verification Code
              </label>
              <input
                id="login-code"
                name="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                placeholder="000000"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className={`${inputClass} text-center font-mono text-lg tracking-[0.35em]`}
              />
              <p className="mt-2 text-xs leading-5 text-white/38">
                Enter the code sent to {phone}.
              </p>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-black text-white shadow-[0_16px_36px_rgba(255,90,60,0.22)] transition-[background-color,box-shadow,transform,opacity] duration-150 ease-out hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-primary/40 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Verifying..." : "Log in with phone"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhoneStep("phone");
                setOtp("");
                setError(null);
              }}
              className="w-full text-sm font-bold text-white/48 transition-colors hover:text-white"
            >
              Change phone number
            </button>
          </form>
        )}

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#171717] px-3 text-white/40">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <OAuthButton provider="google" label="Google" icon={<GoogleIcon />} />
          <OAuthButton provider="facebook" label="Facebook" icon={<FacebookIcon />} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-white/50">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary transition-colors duration-150 hover:text-primary-hover"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
