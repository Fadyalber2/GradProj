"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Eye, EyeOff } from "lucide-react";
import OAuthButton from "@/components/auth/OAuthButton";
import { GoogleIcon, FacebookIcon } from "@/components/auth/OAuthIcons";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/authStore";
import { buildE164, phonePlaceholder } from "@/lib/phoneUtils";
import type { GenderType } from "@/types";

const COUNTRY_CODES = ["+20", "+1", "+44", "+971"];

const GENDER_OPTIONS: { label: string; value: GenderType }[] = [
  { label: "Male", value: "male" },
  { label: "Female", value: "female" },
];

function getPasswordStrength(password: string): 0 | 1 | 2 | 3 {
  if (password.length < 6) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  return score as 0 | 1 | 2 | 3;
}

const STRENGTH_LABEL = ["", "Weak", "Fair", "Strong"] as const;
const STRENGTH_COLOR = ["", "bg-red-500", "bg-yellow-400", "bg-green-500"] as const;

export default function SignUpForm() {
  const router = useRouter();
  const { signup, isLoading } = useAuthStore();

  const [countryCode, setCountryCode] = useState("+20");
  const [phoneInput, setPhoneInput] = useState("");
  const [gender, setGender] = useState<GenderType | "">("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");

  const e164Phone = buildE164(countryCode, phoneInput);
  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setInfo(null);

    const fd = new FormData(e.currentTarget);
    const full_name = (fd.get("name") as string).trim();
    const email = (fd.get("email") as string).trim();
    const confirmPassword = fd.get("confirm-password") as string;
    const tosAccepted = fd.get("tos") === "on";

    if (!full_name || !email || !password) {
      setError("Name, email, and password are required.");
      return;
    }
    if (!gender) {
      setError("Please select your gender.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (!phoneInput.trim()) {
      setError("Phone number is required.");
      return;
    }
    if (!tosAccepted) {
      setError("You must accept the Terms of Service.");
      return;
    }

    try {
      await signup({
        email,
        password,
        full_name,
        phone: e164Phone || undefined,
        country_code: countryCode,
        gender,
      });
      toast.success("Account created! Welcome to AXIOM.");
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Signup failed.";
      if (msg.toLowerCase().includes("confirm") || msg.toLowerCase().includes("check your email")) {
        setInfo(msg);
        toast.success("Account created! Check your email to confirm.");
      } else {
        setError(msg);
        toast.error(msg);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-lg"
    >
      <div className="bg-card-dark rounded-2xl shadow-2xl shadow-black/50 border border-white/10 p-8 sm:p-10">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-black text-primary mb-2 tracking-tight">
            AXIOM
          </h2>
          <h1 className="text-2xl font-bold text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Join the AI-powered real estate platform.
          </p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {info && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-300 text-sm">
            {info}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="name" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              required
              placeholder="Ahmed Mohamed"
              className="block w-full px-4 py-3 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
            />
          </div>

          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@example.com"
              className="block w-full px-4 py-3 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
            />
          </div>

          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Phone Number <span className="text-red-400">*</span>
            </label>
            <div className="flex">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="rounded-l-lg border border-r-0 border-white/10 bg-background-dark text-white focus:ring-2 focus:ring-primary focus:border-primary sm:text-sm px-3 py-3 w-24"
              >
                {COUNTRY_CODES.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <input
                id="phone"
                name="phone"
                type="tel"
                autoComplete="tel"
                placeholder={phonePlaceholder(countryCode)}
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                className="flex-1 min-w-0 block w-full px-4 py-3 rounded-r-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent sm:text-sm"
              />
            </div>
          </div>

          {/* Gender */}
          <div>
            <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
              Gender <span className="text-red-400">*</span>
            </label>
            <div className="flex space-x-6">
              {GENDER_OPTIONS.map((g) => (
                <label key={g.value} className="inline-flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="gender"
                    value={g.value}
                    checked={gender === g.value}
                    onChange={() => setGender(g.value)}
                    className="h-4 w-4 text-primary border-gray-600 focus:ring-primary bg-transparent"
                  />
                  <span className="ml-2 text-sm text-white">{g.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Password + Confirm */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="signup-password" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="signup-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-4 py-3 pr-12 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1 h-1">
                    {([1, 2, 3] as const).map((level) => (
                      <div
                        key={level}
                        className={`flex-1 rounded-full transition-all ${
                          passwordStrength >= level ? STRENGTH_COLOR[passwordStrength] : "bg-white/10"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-xs mt-1 text-gray-400">{STRENGTH_LABEL[passwordStrength]}</p>
                </div>
              )}
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  name="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  className="block w-full px-4 py-3 pr-12 rounded-lg border border-white/10 bg-background-dark text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all sm:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-white transition-colors"
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Terms of Service */}
          <div className="pt-1">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="tos"
                className="mt-0.5 h-4 w-4 rounded border-gray-600 text-primary focus:ring-primary bg-transparent"
              />
              <span className="text-sm text-gray-400">
                I agree to the{" "}
                <Link href="/terms" className="text-primary hover:text-primary-hover transition-colors">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-primary hover:text-primary-hover transition-colors">
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all shadow-lg shadow-primary/25 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {isLoading ? "Creating account…" : "Sign Up"}
            </button>
          </div>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="px-2 bg-card-dark text-gray-400">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <OAuthButton provider="google" label="Google" icon={<GoogleIcon />} />
          <OAuthButton provider="facebook" label="Facebook" icon={<FacebookIcon />} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-primary hover:text-primary-hover transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </motion.div>
  );
}
