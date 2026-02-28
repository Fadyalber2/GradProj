"use client";

import { useEffect, useState } from "react";
import { Sparkles, Lock } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";

interface CompatibilityScoreProps {
  housingId: string;
  tenantTagsList: string[][];
}

interface ScoreResult {
  score: number;
  explanation: string;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference - (score / 100) * circumference;

  const color =
    score >= 70
      ? "#22c55e"   // green
      : score >= 40
      ? "#eab308"   // yellow
      : "#ef4444";  // red

  const label =
    score >= 70 ? "Great Match" : score >= 40 ? "Moderate Match" : "Low Match";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          {/* Track */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="8"
          />
          {/* Fill */}
          <circle
            cx="48"
            cy="48"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={filled}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease" }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-white">{score}</span>
          <span className="text-[10px] text-gray-400">/ 100</span>
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

export default function CompatibilityScore({
  housingId,
  tenantTagsList,
}: CompatibilityScoreProps) {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);

  const [result, setResult] = useState<ScoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false); // true = cached score exists

  // Try to fetch cached score (set after application)
  useEffect(() => {
    if (!user || !session) return;

    api
      .get<ScoreResult>(`/api/ai/compatibility/${housingId}/${user.id}`)
      .then((res) => {
        setResult(res);
        setApplied(true);
      })
      .catch(() => {
        // 404 → no application yet; score not yet computed
        setApplied(false);
      });
  }, [housingId, user, session]);

  // On-demand compute (uses tenant tags from the page)
  async function computeScore() {
    if (!user || tenantTagsList.length === 0) return;
    setLoading(true);
    try {
      // Use the logged-in user's lifestyle tags from their profile badges as a proxy.
      // Real tags would come from a seeker preferences form (Phase 5).
      const applicantTags = user.badges ?? [];
      const res = await api.post<ScoreResult>("/api/ai/compatibility", {
        applicant_tags: applicantTags,
        tenant_tags_list: tenantTagsList,
      });
      setResult(res);
    } catch {
      // silently fail — non-blocking feature
    } finally {
      setLoading(false);
    }
  }

  // Not logged in
  if (!user) {
    return (
      <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
        <Lock className="h-4 w-4 text-gray-500 shrink-0" />
        <p className="text-xs text-gray-400">
          <a href="/login" className="text-primary hover:underline font-medium">
            Sign in
          </a>{" "}
          to see your compatibility score
        </p>
      </div>
    );
  }

  // Score computed — show ring
  if (result) {
    return (
      <div className="bg-card-dark rounded-2xl p-5 border border-white/10 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold text-white">Your Match Score</h3>
        </div>
        <div className="flex justify-center">
          <ScoreRing score={Math.round(result.score)} />
        </div>
        {result.explanation && (
          <p className="text-xs text-gray-400 leading-relaxed text-center">
            {result.explanation}
          </p>
        )}
      </div>
    );
  }

  // Applied but still loading cached result, or computing
  if (loading) {
    return (
      <div className="bg-card-dark rounded-2xl p-5 border border-white/10 flex items-center justify-center gap-2 min-h-[80px]">
        <Sparkles className="h-4 w-4 text-primary animate-pulse" />
        <span className="text-xs text-gray-400">Computing your match…</span>
      </div>
    );
  }

  // No cached score — prompt to check
  return (
    <div className="bg-card-dark rounded-2xl p-5 border border-white/10 space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-bold text-white">Compatibility Check</h3>
      </div>
      <p className="text-xs text-gray-400">
        {applied
          ? "Your score is being calculated after application."
          : "See how well you match with the current housemates."}
      </p>
      {!applied && tenantTagsList.length > 0 && (
        <button
          onClick={computeScore}
          className="w-full py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Check My Match
        </button>
      )}
    </div>
  );
}
