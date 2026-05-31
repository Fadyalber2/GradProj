"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Loader2, Zap, Building2, Star } from "lucide-react";
import type { ElementType } from "react";
import {
  subscriptionQuery,
  startTrialMutation,
  checkoutMutation,
  cancelSubscriptionMutation,
} from "@/lib/queries";
import type { SubscriptionStatus } from "@/types/api";
import { formatEGP } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanKey = "free" | "basic" | "pro";

interface PlanDef {
  key: PlanKey;
  name: string;
  priceMonthly: number | null;
  listingCap: number;
  aiQuota: number;
  featured: boolean;
  icon: ElementType;
  features: string[];
  highlight: boolean;
}

// ── Plan definitions (hardcoded) ──────────────────────────────────────────────

const PLANS: PlanDef[] = [
  {
    key: "free",
    name: "Free",
    priceMonthly: 0,
    listingCap: 1,
    aiQuota: 0,
    featured: false,
    icon: Zap,
    highlight: false,
    features: [
      "1 active listing",
      "Basic listing visibility",
      "Standard support",
    ],
  },
  {
    key: "basic",
    name: "Basic",
    priceMonthly: 199,
    listingCap: 5,
    aiQuota: 10,
    featured: false,
    icon: Star,
    highlight: true,
    features: [
      "5 active listings",
      "10 AI-generated descriptions / mo",
      "Priority listing placement",
      "Email support",
    ],
  },
  {
    key: "pro",
    name: "Pro",
    priceMonthly: 499,
    listingCap: 20,
    aiQuota: 50,
    featured: true,
    icon: Building2,
    highlight: false,
    features: [
      "20 active listings",
      "50 AI-generated descriptions / mo",
      "Featured listing slots",
      "Analytics dashboard",
      "Priority support",
    ],
  },
];

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

// ── Plan badge ────────────────────────────────────────────────────────────────

function PlanBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
      {label}
    </span>
  );
}

// ── Plan card ─────────────────────────────────────────────────────────────────

interface PlanCardProps {
  plan: PlanDef;
  currentPlan: SubscriptionStatus["plan"];
  trialUsed: boolean;
  onStartTrial: () => void;
  onUpgrade: (plan: "basic" | "pro") => void;
  loadingTrial: boolean;
  loadingCheckout: boolean;
  checkoutTarget: "basic" | "pro" | null;
}

function PlanCard({
  plan,
  currentPlan,
  trialUsed,
  onStartTrial,
  onUpgrade,
  loadingTrial,
  loadingCheckout,
  checkoutTarget,
}: PlanCardProps) {
  const isCurrent = currentPlan === plan.key;
  const isTrial = currentPlan === "trial" && plan.key === "basic";
  const Icon = plan.icon;

  const isHighlighted = plan.highlight;

  return (
    <div
      className={[
        "relative flex flex-col rounded-2xl border p-7 transition-shadow",
        isHighlighted
          ? "border-primary/40 bg-primary/5 shadow-lg shadow-primary/10"
          : "border-white/10 bg-white/[0.03]",
        isCurrent || isTrial ? "ring-2 ring-primary/60" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* Popular badge */}
      {isHighlighted && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow">
            Most Popular
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={[
              "flex h-10 w-10 items-center justify-center rounded-xl",
              isHighlighted ? "bg-primary/20" : "bg-white/5",
            ].join(" ")}
          >
            <Icon
              className={["h-5 w-5", isHighlighted ? "text-primary" : "text-white/60"].join(" ")}
            />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">{plan.name}</h3>
            {(isCurrent || isTrial) && (
              <div className="mt-0.5">
                <PlanBadge label={isTrial ? "Trial" : "Current plan"} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        {plan.priceMonthly === 0 ? (
          <p className="text-4xl font-bold text-white">Free</p>
        ) : (
          <div className="flex items-end gap-1">
            <span className="text-4xl font-bold text-white">
              {formatEGP(plan.priceMonthly!)}
            </span>
            <span className="mb-1 text-sm text-white/40">/mo</span>
          </div>
        )}
        <p className="mt-1.5 text-sm text-white/40">
          {plan.listingCap} active listing{plan.listingCap !== 1 ? "s" : ""} &middot;{" "}
          {plan.aiQuota === 0
            ? "No AI descriptions"
            : `${plan.aiQuota} AI descriptions/mo`}
        </p>
      </div>

      {/* Features */}
      <ul className="mb-8 flex-1 space-y-2.5">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-sm text-white/70">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            {feat}
          </li>
        ))}
      </ul>

      {/* CTA */}
      <div className="space-y-2">
        {/* Upgrade button for Basic / Pro */}
        {plan.key !== "free" && !isCurrent && !isTrial && (
          <button
            onClick={() => onUpgrade(plan.key as "basic" | "pro")}
            disabled={loadingCheckout}
            className={[
              "flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
              isHighlighted
                ? "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                : "border border-white/15 bg-white/5 text-white hover:bg-white/10 active:scale-[0.98]",
              loadingCheckout && checkoutTarget === plan.key ? "opacity-70" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {loadingCheckout && checkoutTarget === plan.key ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting…
              </>
            ) : (
              "Upgrade"
            )}
          </button>
        )}

        {/* Already on this plan */}
        {(isCurrent || isTrial) && plan.key !== "free" && (
          <div className="flex w-full items-center justify-center rounded-xl border border-primary/30 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary">
            <Check className="mr-2 h-4 w-4" />
            {isTrial ? "Trial active" : "Active plan"}
          </div>
        )}

        {/* Free plan: either "current" label or trial CTA */}
        {plan.key === "free" && isCurrent && !trialUsed && (
          <button
            onClick={onStartTrial}
            disabled={loadingTrial}
            className="flex w-full items-center justify-center rounded-xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-semibold text-primary transition-all hover:bg-primary/20 active:scale-[0.98] disabled:opacity-70"
          >
            {loadingTrial ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting trial…
              </>
            ) : (
              "Start 7-day free trial (Basic-level access)"
            )}
          </button>
        )}

        {plan.key === "free" && isCurrent && trialUsed && (
          <div className="flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/40">
            Current plan
          </div>
        )}

        {plan.key === "free" && !isCurrent && (
          <div className="flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-2.5 text-sm text-white/30">
            Free
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PricingPage() {
  const queryClient = useQueryClient();
  const [cancelSuccess, setCancelSuccess] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<"basic" | "pro" | null>(null);

  // ── Queries ──

  const { data, isLoading } = useQuery<SubscriptionStatus>(subscriptionQuery);

  // ── Mutations ──

  const trialMutation = useMutation({
    ...startTrialMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subscription", "me"] });
    },
  });

  const upgradeMutation = useMutation({
    ...checkoutMutation,
    onSuccess: (result) => {
      window.location.href = result.checkout_url;
    },
  });

  const cancelMutation = useMutation({
    ...cancelSubscriptionMutation,
    onSuccess: () => {
      setCancelSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["subscription", "me"] });
    },
  });

  const handleUpgrade = (plan: "basic" | "pro") => {
    setCheckoutTarget(plan);
    upgradeMutation.mutate(plan);
  };

  // ── Loading ──

  if (isLoading || !data) return <Spinner />;

  const currentPlan = data.plan;
  const canCancel = currentPlan === "basic" || currentPlan === "pro";

  return (
    <main className="min-h-screen bg-[#0f0f0f] px-4 py-16 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        {/* Page header */}
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Owner Plans
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-white/50">
            List your properties, power them with AI, and reach thousands of
            buyers and renters across Egypt.
          </p>

          {/* Current plan info strip */}
          <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60">
            Current plan:
            <span className="font-semibold capitalize text-white">{currentPlan}</span>
            {data.trial_ends_at && currentPlan === "trial" && (
              <span className="text-white/40">
                &mdash; trial ends{" "}
                {new Date(data.trial_ends_at).toLocaleDateString("en-EG", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
          </div>
        </div>

        {/* Cancellation success banner */}
        {cancelSuccess && (
          <div className="mb-8 rounded-xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-amber-300">
            Cancellation scheduled &mdash; your plan stays active until the end
            of the current billing period.
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {PLANS.map((plan) => (
            <PlanCard
              key={plan.key}
              plan={plan}
              currentPlan={currentPlan}
              trialUsed={data.trial_used}
              onStartTrial={() => trialMutation.mutate()}
              onUpgrade={handleUpgrade}
              loadingTrial={trialMutation.isPending}
              loadingCheckout={upgradeMutation.isPending}
              checkoutTarget={checkoutTarget}
            />
          ))}
        </div>

        {/* Usage summary */}
        <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/40">
            Your current usage
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <UsageStat
              label="Active listings"
              value={data.active_listings}
              cap={data.listing_cap === 999 ? null : data.listing_cap}
            />
            <UsageStat
              label="AI descriptions used"
              value={data.ai_used}
              cap={data.ai_quota === 0 ? null : data.ai_quota}
            />
            <UsageStat label="AI remaining" value={data.ai_remaining} cap={null} />
            <div className="flex flex-col">
              <span className="text-xs text-white/30">Renewal</span>
              <span className="mt-1 text-sm font-medium text-white/70">
                {data.current_period_end
                  ? new Date(data.current_period_end).toLocaleDateString("en-EG", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Cancel plan */}
        {canCancel && !cancelSuccess && (
          <div className="mt-8 flex flex-col items-center gap-2">
            <button
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="text-sm text-white/30 underline-offset-2 transition-colors hover:text-red-400 hover:underline disabled:opacity-50"
            >
              {cancelMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Cancelling…
                </span>
              ) : (
                "Cancel plan"
              )}
            </button>
            <p className="text-xs text-white/20">
              Your access continues until the current billing period ends.
            </p>
          </div>
        )}

        {/* Agency row */}
        <div className="mt-14 flex flex-col items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-7 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-base font-semibold text-white">
              Need more? Talk to us about an Agency plan.
            </p>
            <p className="mt-1 text-sm text-white/40">
              Unlimited listings, dedicated account manager, custom integrations,
              and SLA support.
            </p>
          </div>
          <a
            href="mailto:hello@axiom.eg?subject=Agency%20Plan%20Enquiry"
            className="mt-4 inline-flex shrink-0 items-center rounded-xl border border-white/15 bg-white/5 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98] sm:mt-0"
          >
            Contact us
          </a>
        </div>
      </div>
    </main>
  );
}

// ── Usage stat sub-component ──────────────────────────────────────────────────

function UsageStat({
  label,
  value,
  cap,
}: {
  label: string;
  value: number;
  cap: number | null;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-white/30">{label}</span>
      <span className="mt-1 text-sm font-medium text-white/70">
        {value}
        {cap !== null && (
          <span className="text-white/30"> / {cap}</span>
        )}
      </span>
      {cap !== null && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-primary/70 transition-all"
            style={{ width: `${Math.min(100, (value / cap) * 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}
