"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export default function AuthCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    let done = false;

    const redirect = async (session: { access_token: string } | null) => {
      if (done) return;
      done = true;
      if (!session) {
        router.replace("/login?error=oauth_failed");
        return;
      }
      await useAuthStore.getState().refreshProfile();
      router.replace("/dashboard");
    };

    // If Supabase already parsed the session from the URL hash / PKCE code
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) redirect(session);
    });

    // Otherwise wait for the SIGNED_IN event (PKCE exchange completes async)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        subscription.unsubscribe();
        redirect(session);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background-dark">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Completing sign in…</p>
      </div>
    </div>
  );
}
