"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CardElement, Elements, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  X,
} from "lucide-react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { api } from "@/lib/api";
import { bookingsQueries, createPaymentIntentMutation } from "@/lib/queries";
import { formatEGP } from "@/lib/utils";
import type { BookingBrief, CreatePaymentIntentResponse, ListingDetailWithSimilar } from "@/types/api";

type Props = {
  listing: ListingDetailWithSimilar;
  onClose: () => void;
};

type Step = "details" | "payment" | "success";

const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;

export default function BookingModal({ listing, onClose }: Props) {
  const [step, setStep] = useState<Step>("details");
  const [startDate, setStartDate] = useState("");
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [durationMonths, setDurationMonths] = useState(3);
  const [paymentIntent, setPaymentIntent] = useState<CreatePaymentIntentResponse | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const mutation = useMutation(createPaymentIntentMutation);
  // Rent-only: BookNowButton is hidden for sale listings (those use WhatsApp contact).
  // Fee comes from the backend (/api/bookings/fees) so the preview can never
  // diverge from the amount Stripe actually charges; 2000 is a display fallback.
  const feesQuery = useQuery(bookingsQueries.fees());
  const fullPrice = listing.price * durationMonths;
  const feeDue = feesQuery.data?.rent_booking_fee ?? 2000;

  async function createPaymentIntent() {
    setPaymentError(null);
    try {
      const result = await mutation.mutateAsync({
        listing_id: listing.id,
        booking_type: "rent",
        start_date: startDate,
        duration_months: durationMonths,
      });
      setPaymentIntent(result);
      setStep("payment");
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : "Payment could not be started.");
    }
  }

  async function waitForBooking(intentId: string) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        const booking = await api.get<BookingBrief>(`/api/bookings/by-intent/${intentId}`);
        return booking;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
    throw new Error("Payment succeeded, but the booking is still being created. Try opening your dashboard in a moment.");
  }

  async function syncPaidBooking(intentId: string) {
    try {
      return await api.post<BookingBrief>("/api/bookings/sync-payment", {
        payment_intent_id: intentId,
      });
    } catch (syncError) {
      try {
        return await waitForBooking(intentId);
      } catch {
        throw syncError;
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-[100dvh] items-center justify-center p-3 sm:p-4">
        <div className="relative w-full max-w-xl overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#181818] shadow-[0_24px_80px_-36px_rgba(0,0,0,0.85)]">
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Booking</p>
              <h2 className="mt-1 text-lg font-bold text-white">Book Property</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-gray-400 transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/10 hover:text-white active:scale-95"
              aria-label="Close booking modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {step === "details" && (
            <div className="space-y-5 p-5 sm:p-6">
              <ListingSummary listing={listing} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <MoveInDatePicker
                  value={startDate}
                  open={datePickerOpen}
                  onOpenChange={setDatePickerOpen}
                />
                <DurationPicker value={durationMonths} onChange={setDurationMonths} />
                {datePickerOpen && (
                  <DateCalendar
                    value={startDate}
                    onChange={setStartDate}
                    onClose={() => setDatePickerOpen(false)}
                  />
                )}
              </div>
              <PriceBreakdown
                monthlyPrice={listing.price}
                durationMonths={durationMonths}
                fullPrice={fullPrice}
                feeDue={feeDue}
              />
              {paymentError && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {paymentError}
                </p>
              )}
              <button
                type="button"
                onClick={createPaymentIntent}
                disabled={mutation.isPending || !startDate}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-[background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Continue to payment
              </button>
            </div>
          )}

          {step === "payment" && paymentIntent && (
            <Elements stripe={stripePromise}>
              <PaymentStep
                amount={paymentIntent.booking_preview.total_price}
                clientSecret={paymentIntent.client_secret}
                stripeReady={Boolean(stripePublishableKey)}
                onBack={() => setStep("details")}
                onPaid={async () => {
                  const booking = await syncPaidBooking(paymentIntent.payment_intent_id);
                  setBookingId(booking.id);
                  setStep("success");
                }}
              />
            </Elements>
          )}

          {step === "success" && (
            <div className="space-y-5 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
                <Check className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Booking deposit received</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Your booking deposit secures this property. Visit in person, then confirm it from your booking page.
                </p>
              </div>
              <Link
                href={bookingId ? `/booking/${bookingId}` : "/dashboard"}
                className="inline-flex rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white transition-[background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-hover active:scale-[0.99]"
              >
                View Booking
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentStep({
  amount,
  clientSecret,
  stripeReady,
  onBack,
  onPaid,
}: {
  amount: number;
  clientSecret: string;
  stripeReady: boolean;
  onBack: () => void;
  onPaid: () => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitPayment() {
    if (!stripeReady) {
      setError("Stripe publishable key is missing.");
      return;
    }
    if (!stripe || !elements) return;
    const card = elements.getElement(CardElement);
    if (!card) return;

    setProcessing(true);
    setError(null);
    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });
    if (result.error) {
      setError(result.error.message || "Payment failed. Please try another card.");
      setProcessing(false);
      return;
    }

    try {
      await onPaid();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment succeeded, but booking lookup failed.");
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-5 p-5 sm:p-6">
      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <div className="mb-3 flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
            <CreditCard className="h-4 w-4" />
          </span>
          <div>
            <p className="font-bold text-white">Card payment</p>
            {process.env.NODE_ENV === "development" && (
              <p className="text-xs text-gray-500">Test card: 4242 4242 4242 4242</p>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.06] px-3 py-3">
          <CardElement
            options={{
              style: {
                base: {
                  color: "#fff",
                  fontSize: "15px",
                  "::placeholder": { color: "#9ca3af" },
                },
                invalid: { color: "#fca5a5" },
              },
            }}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
          {error.includes("dashboard") && (
            <Link href="/dashboard?tab=bookings" className="mt-1 block font-bold text-red-100 underline underline-offset-2">
              Open my bookings
            </Link>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={processing}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-gray-200 transition-[background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/5 active:scale-[0.99] disabled:opacity-60"
        >
          Back
        </button>
        <button
          type="button"
          onClick={submitPayment}
          disabled={!stripeReady || !stripe || processing}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-white transition-[background-color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary-hover active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {processing && <Loader2 className="h-4 w-4 animate-spin" />}
          Pay {formatEGP(amount)}
        </button>
      </div>
    </div>
  );
}

function MoveInDatePicker({
  value,
  open,
  onOpenChange,
}: {
  value: string;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;

  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-gray-300">Move-in date</span>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left text-sm text-white outline-none transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.08] focus:border-primary active:scale-[0.99]"
        aria-expanded={open}
      >
        <span className={selectedDate ? "text-white" : "text-gray-300"}>
          {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Select date"}
        </span>
        <CalendarDays className="h-4 w-4 text-gray-400" />
      </button>
    </div>
  );
}

function DateCalendar({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
}) {
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(new Date()));
  const today = startOfDay(new Date());
  const selectedDate = value ? new Date(`${value}T00:00:00`) : null;
  const days = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(startOfMonth(visibleMonth)),
        end: endOfWeek(endOfMonth(visibleMonth)),
      }),
    [visibleMonth]
  );

  function selectDate(dateValue: Date) {
    if (isBefore(dateValue, today)) return;
    onChange(format(dateValue, "yyyy-MM-dd"));
    onClose();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#202020] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:col-span-2">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setVisibleMonth((month) => addMonths(month, -1))}
          className="rounded-full p-1.5 text-gray-400 transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-bold text-white">{format(visibleMonth, "MMMM yyyy")}</p>
        <button
          type="button"
          onClick={() => setVisibleMonth((month) => addMonths(month, 1))}
          className="rounded-full p-1.5 text-gray-400 transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/10 hover:text-white active:scale-95"
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
        {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-7 gap-1">
        {days.map((day) => {
          const disabled = isBefore(day, today);
          const outsideMonth = day.getMonth() !== visibleMonth.getMonth();
          const selected = selectedDate ? isSameDay(day, selectedDate) : false;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => selectDate(day)}
              disabled={disabled}
              className={[
                "flex h-8 items-center justify-center rounded-lg text-xs font-semibold transition-[background-color,color,transform,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95",
                selected ? "bg-primary text-white" : "text-gray-200 hover:bg-white/10",
                outsideMonth ? "opacity-35" : "",
                disabled ? "cursor-not-allowed opacity-20 hover:bg-transparent" : "",
              ].join(" ")}
            >
              {format(day, "d")}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DurationPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const options = [1, 2, 3, 6, 12];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function label(months: number) {
    return `${months} ${months === 1 ? "month" : "months"}`;
  }

  return (
    <div ref={rootRef} className="relative space-y-1.5">
      <span className="text-xs font-medium text-gray-300">Duration</span>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 text-left text-sm text-white outline-none transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.08] focus:border-primary active:scale-[0.99]"
        aria-expanded={open}
      >
        <span>{label(value)}</span>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-white/10 bg-[#202020] p-1.5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)]">
          {options.map((months) => {
            const selected = months === value;

            return (
              <button
                key={months}
                type="button"
                onClick={() => {
                  onChange(months);
                  setOpen(false);
                }}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold transition-[background-color,color,transform] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.99]",
                  selected ? "bg-primary text-white" : "text-gray-200 hover:bg-white/10",
                ].join(" ")}
              >
                {label(months)}
                {selected && <Check className="h-4 w-4" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ListingSummary({ listing }: { listing: ListingDetailWithSimilar }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-black/30">
        <Image
          src={listing.images[0] || "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600"}
          alt={listing.title}
          fill
          className="object-cover"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-white">{listing.title}</p>
        <p className="truncate text-sm text-gray-400">{listing.location}</p>
      </div>
    </div>
  );
}

function PriceBreakdown({
  monthlyPrice,
  durationMonths,
  fullPrice,
  feeDue,
}: {
  monthlyPrice: number;
  durationMonths: number;
  fullPrice: number;
  feeDue: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
          <CalendarCheck className="h-4 w-4" />
        </span>
        <div>
          <p className="font-bold text-white">Payment summary</p>
          <p className="text-xs text-gray-500">A booking deposit secures your booking.</p>
        </div>
      </div>
      <div className="space-y-2">
        <Row label="Monthly rent" value={formatEGP(monthlyPrice)} />
        <Row label="Duration" value={`${durationMonths} ${durationMonths === 1 ? "month" : "months"}`} />
        <Row label="Lease value" value={formatEGP(fullPrice)} />
        <div className="mt-3 border-t border-white/10 pt-3">
          <Row label="Booking deposit (due now)" value={formatEGP(feeDue)} strong />
        </div>
        <p className="pt-1 text-xs text-gray-500">
          Rent is paid to the owner directly. AXIOM collects only the deposit.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-gray-400">{label}</span>
      <span className={strong ? "font-bold text-white" : "font-semibold text-gray-200"}>{value}</span>
    </div>
  );
}
