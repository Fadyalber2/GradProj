"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Loader2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35, ease: "easeOut" as const },
  }),
};

export default function ResetPasswordForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  // Wait for Supabase to pick up the recovery token from the URL
  useEffect(() => {
    let done = false;

    const handleSession = () => {
      if (done) return;
      done = true;
      setSessionReady(true);
    };

    // Check if session already exists (token already exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) handleSession();
    });

    // Listen for PASSWORD_RECOVERY or SIGNED_IN events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (
        session &&
        (event === "PASSWORD_RECOVERY" ||
          event === "SIGNED_IN" ||
          event === "TOKEN_REFRESHED")
      ) {
        handleSession();
      }
    });

    // Fallback: if after 3 seconds no session, still show the form
    const timeout = setTimeout(() => {
      if (!done) handleSession();
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const fd = new FormData(e.currentTarget);
    const password = fd.get("password") as string;
    const confirm = fd.get("confirm") as string;

    if (!password || !confirm) {
      setError("Please fill in both fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });
      if (updateError) throw new Error(updateError.message);

      setSuccess(true);
      toast.success("Password updated successfully!");

      // Refresh auth store profile
      await useAuthStore.getState().refreshProfile();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to update password.";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipToDashboard = async () => {
    // Refresh profile to ensure auth store is in sync
    await useAuthStore.getState().refreshProfile();
    router.push("/dashboard");
  };

  // Loading state while waiting for session
  if (!sessionReady) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="relative backdrop-blur-xl bg-white/[0.03] rounded-2xl shadow-2xl shadow-black/60 border border-white/[0.08] p-8 sm:p-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none rounded-2xl" />
          <div className="relative text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-400 text-sm">
              Verifying your reset link...
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="w-full max-w-md"
    >
      <div className="relative backdrop-blur-xl bg-white/[0.03] rounded-2xl shadow-2xl shadow-black/60 border border-white/[0.08] p-8 sm:p-10 overflow-hidden">
        {/* Glass highlight */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-transparent pointer-events-none rounded-2xl" />

        <div className="relative">
          {success ? (
            /* Success state */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              className="text-center py-4"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-6">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-3">
                Password Updated
              </h1>
              <p className="text-sm text-gray-400 leading-relaxed mb-8">
                Your password has been changed successfully. You&apos;re already
                logged in.
              </p>
              <button
                onClick={() => router.push("/dashboard")}
                className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 cursor-pointer"
              >
                Go to Dashboard
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={0}
                className="text-center mb-8"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/20 mb-6">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-white">
                  Set New Password
                </h1>
                <p className="mt-3 text-sm text-gray-400 leading-relaxed">
                  Choose a new password for your account, or skip and head
                  straight to your dashboard.
                </p>
              </motion.div>

              {/* Error banner */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mb-5 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* New Password */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={1}
                >
                  <label
                    htmlFor="password"
                    className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5"
                  >
                    New Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <Lock className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Enter new password"
                      className="block w-full pl-10 pr-10 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-gray-500 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-200 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-white transition-colors duration-200 cursor-pointer"
                      tabIndex={-1}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </motion.div>

                {/* Confirm Password */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={2}
                >
                  <label
                    htmlFor="confirm"
                    className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                      <Lock className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      id="confirm"
                      name="confirm"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      required
                      placeholder="Confirm new password"
                      className="block w-full pl-10 pr-10 py-3 rounded-xl border border-white/[0.08] bg-white/[0.04] text-white placeholder-gray-500 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 focus:bg-white/[0.06] transition-all duration-200 sm:text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-white transition-colors duration-200 cursor-pointer"
                      tabIndex={-1}
                      aria-label={
                        showConfirm ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirm ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </motion.div>

                {/* Submit */}
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={3}
                  className="pt-1"
                >
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-primary transition-all duration-200 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-lg cursor-pointer"
                  >
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isLoading ? "Updating..." : "Update Password"}
                  </button>
                </motion.div>
              </form>

              {/* Divider */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={4}
                className="relative my-7"
              >
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/[0.08]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="px-3 bg-transparent backdrop-blur-sm text-gray-500">
                    Or
                  </span>
                </div>
              </motion.div>

              {/* Skip to Dashboard */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={5}
              >
                <button
                  type="button"
                  onClick={handleSkipToDashboard}
                  className="w-full flex justify-center items-center gap-2 py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.10] hover:border-white/[0.15] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background-dark focus:ring-white/20 transition-all duration-200 cursor-pointer"
                >
                  Skip & Go to Dashboard
                  <ArrowRight className="h-4 w-4" />
                </button>
              </motion.div>

              {/* Back to login */}
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={6}
                className="mt-7 text-center"
              >
                <p className="text-sm text-gray-500">
                  Want to log in with different credentials?{" "}
                  <Link
                    href="/login"
                    className="font-medium text-primary hover:text-primary-hover transition-colors duration-200"
                  >
                    Log In
                  </Link>
                </p>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
