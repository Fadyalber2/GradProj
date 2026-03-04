"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface OAuthButtonProps {
  provider: "google" | "facebook";
  label: string;
  icon: React.ReactNode;
}

export default function OAuthButton({ provider, label, icon }: OAuthButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      toast.error(`${label} sign-in failed: ${error.message}`);
      setLoading(false);
    }
    // No error → browser is redirecting; keep the spinner up
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={loading}
      className="flex justify-center items-center py-2.5 px-4 border border-white/10 rounded-lg bg-background-dark text-sm font-medium text-white hover:bg-white/5 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <span className="mr-2 flex items-center">{icon}</span>
      )}
      {label}
    </button>
  );
}
