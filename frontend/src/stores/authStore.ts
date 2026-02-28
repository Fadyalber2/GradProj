import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthUser, SignUpData } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function fetchProfile(accessToken: string): Promise<AuthUser | null> {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: SignUpData) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const user = await fetchProfile(session.access_token);
      set({ session, user, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }

    // Keep state in sync with Supabase auth events (token refresh, OAuth, etc.)
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        if (session) {
          const user = await fetchProfile(session.access_token);
          set({ session, user });
        }
      } else if (event === "SIGNED_OUT") {
        set({ session: null, user: null });
      }
    });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const user = await fetchProfile(data.session.access_token);
      set({ session: data.session, user });
    } finally {
      set({ isLoading: false });
    }
  },

  signup: async ({ email, password, full_name, phone, country_code, gender }) => {
    set({ isLoading: true });
    try {
      // Go through FastAPI so it can set phone/country on the profile
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, full_name, phone, country_code, gender }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((body as { detail?: string }).detail || "Signup failed");
      }
      // Email confirmation required — account created but not yet confirmed
      if (res.status === 202) {
        throw new Error((body as { message?: string }).message || "Check your email to confirm your account");
      }
      // Sign in via Supabase JS to get a managed session
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const user = await fetchProfile(data.session.access_token);
      set({ session: data.session, user });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await supabase.auth.signOut();
    set({ session: null, user: null });
  },

  refreshProfile: async () => {
    const { session } = get();
    if (!session) return;
    const user = await fetchProfile(session.access_token);
    if (user) set({ user });
  },
}));
