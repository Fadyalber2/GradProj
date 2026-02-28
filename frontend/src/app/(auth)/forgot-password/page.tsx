import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password — Axiom",
  description:
    "Reset your Axiom password. Enter your email and we'll send you a link to get back in.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex-grow flex items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative background blurs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <ForgotPasswordForm />
    </div>
  );
}
