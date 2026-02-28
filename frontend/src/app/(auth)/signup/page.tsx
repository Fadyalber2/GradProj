import type { Metadata } from "next";
import SignUpForm from "@/components/auth/SignUpForm";

export const metadata: Metadata = {
  title: "Sign Up — Axiom",
  description:
    "Create your Axiom account and find homes that match your vibe.",
};

export default function SignUpPage() {
  return (
    <main className="flex-grow flex items-center justify-center pt-28 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden min-h-[calc(100vh-64px)]">
      {/* Decorative blurs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <SignUpForm />
    </main>
  );
}
