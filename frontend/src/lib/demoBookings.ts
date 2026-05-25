import { addMonths, formatISO } from "date-fns";
import { calculatePlatformFee } from "@/lib/utils";
import type { BookingBrief, BookingDisbursement, ListingDetailWithSimilar } from "@/types/api";
import type { Housemate } from "@/types";

const STORAGE_KEY = "axiom_demo_bookings";
const HOUSEMATES_KEY = "axiom_demo_confirmed_housemates";
const PLATFORM_CUT_PCT = 5;

type CreateDemoBookingInput = {
  listing: ListingDetailWithSimilar;
  booking_type: "rent" | "sale";
  start_date?: string | null;
  duration_months?: number | null;
  renter: {
    id: string;
    full_name?: string | null;
    avatar_url?: string | null;
  };
};

type CreateDemoBookingResponse = {
  booking_id: string;
  total_price: number;
  platform_cut_amount: number;
  owner_amount: number;
  booking_type: "rent" | "sale";
};

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function readBookings(): BookingBrief[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as BookingBrief[]) : [];
  } catch {
    return [];
  }
}

type ConfirmedHousemate = Housemate & {
  listingId: string;
  renterId: string;
};

function readConfirmedHousemates(): ConfirmedHousemate[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(HOUSEMATES_KEY);
    return raw ? (JSON.parse(raw) as ConfirmedHousemate[]) : [];
  } catch {
    return [];
  }
}

function writeConfirmedHousemates(housemates: ConfirmedHousemate[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(HOUSEMATES_KEY, JSON.stringify(housemates));
}

function writeBookings(bookings: BookingBrief[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function firstImage(listing: ListingDetailWithSimilar) {
  return listing.images[0] || null;
}

function toIsoDate(value: Date) {
  return formatISO(value, { representation: "date" });
}

function createDisbursements(booking: BookingBrief): BookingDisbursement[] {
  if (booking.booking_type !== "rent" || !booking.start_date || !booking.duration_months) return [];
  const start = new Date(`${booking.start_date}T00:00:00`);
  return Array.from({ length: booking.duration_months }, (_, index) => {
    const monthNumber = index + 1;
    const monthlyPrice = booking.monthly_price ?? 0;
    return {
      id: createId("demo_disbursement"),
      booking_id: booking.id,
      month_number: monthNumber,
      amount: monthlyPrice,
      scheduled_date: toIsoDate(addMonths(start, index)),
      status: "scheduled",
      owner_requested_at: null,
      released_at: null,
      created_at: new Date().toISOString(),
    };
  });
}

function saveUpdatedBooking(id: string, update: (booking: BookingBrief) => BookingBrief) {
  const bookings = readBookings();
  const index = bookings.findIndex((booking) => booking.id === id);
  if (index < 0) throw new Error("Booking not found");
  const updated = update(bookings[index]);
  bookings[index] = updated;
  writeBookings(bookings);
  return updated;
}

function addConfirmedRenterToListing(booking: BookingBrief) {
  if (booking.listing_category !== "shared_housing") return;
  const existing = readConfirmedHousemates();
  const alreadyAdded = existing.some(
    (mate) => mate.listingId === booking.listing_id && mate.renterId === booking.renter_id
  );
  if (alreadyAdded) return;

  writeConfirmedHousemates([
    {
      listingId: booking.listing_id,
      renterId: booking.renter_id,
      name: booking.renter_name || "Confirmed renter",
      age: 0,
      occupation: "Confirmed renter",
      avatar: booking.renter_avatar || "",
      tags: ["confirmed renter", booking.start_date ? `moves in ${booking.start_date}` : "move-in confirmed"],
      lifestylePreferences: null,
    },
    ...existing,
  ]);
}

export const demoBookings = {
  listMine(userId?: string | null) {
    if (!userId) return [];
    return readBookings()
      .filter((booking) => booking.renter_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  listReceived(userId?: string | null) {
    if (!userId) return [];
    return readBookings()
      .filter((booking) => booking.owner_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  },

  get(id: string) {
    return readBookings().find((booking) => booking.id === id) ?? null;
  },

  create(input: CreateDemoBookingInput): CreateDemoBookingResponse {
    const isRent = input.booking_type === "rent";
    const duration = isRent ? Number(input.duration_months || 1) : null;
    const rentSubtotal = isRent ? input.listing.price * Number(duration) : 0;
    const fee = isRent ? calculatePlatformFee(rentSubtotal) : { platformFee: 0, ownerReceives: input.listing.price };
    const total = isRent ? rentSubtotal + fee.platformFee : input.listing.price;
    const ownerReceives = isRent ? rentSubtotal : input.listing.price;
    const startDate = isRent ? input.start_date || null : null;
    const endDate = startDate && duration ? toIsoDate(addMonths(new Date(`${startDate}T00:00:00`), duration)) : null;

    const booking: BookingBrief = {
      id: createId("demo_booking"),
      listing_id: input.listing.id,
      listing_title: input.listing.title,
      listing_image: firstImage(input.listing),
      listing_location: input.listing.location,
      renter_id: input.renter.id,
      owner_id: input.listing.owner_id,
      booking_type: input.booking_type,
      listing_category: input.listing.category,
      start_date: startDate,
      end_date: endDate,
      duration_months: duration,
      monthly_price: isRent ? input.listing.price : null,
      total_price: total,
      platform_cut_pct: isRent ? PLATFORM_CUT_PCT : 0,
      platform_cut_amount: fee.platformFee,
      owner_amount: ownerReceives,
      status: "pending_confirmation",
      renter_confirmed_at: null,
      tenant_vacated_at: null,
      vacated_by: null,
      disbursements: [],
      renter_name: input.renter.full_name,
      renter_avatar: input.renter.avatar_url,
      created_at: new Date().toISOString(),
    };

    writeBookings([booking, ...readBookings()]);
    return {
      booking_id: booking.id,
      total_price: booking.total_price,
      platform_cut_amount: booking.platform_cut_amount,
      owner_amount: booking.owner_amount,
      booking_type: booking.booking_type,
    };
  },

  confirm(id: string) {
    const updated = saveUpdatedBooking(id, (booking) => ({
      ...booking,
      status: "active",
      renter_confirmed_at: new Date().toISOString(),
      disbursements: booking.disbursements.length ? booking.disbursements : createDisbursements(booking),
    }));
    addConfirmedRenterToListing(updated);
    return updated;
  },

  vacate(id: string, userId?: string | null) {
    return saveUpdatedBooking(id, (booking) => ({
      ...booking,
      status: "completed",
      tenant_vacated_at: new Date().toISOString(),
      vacated_by: userId === booking.owner_id ? "owner" : "renter",
    }));
  },

  requestDisbursement(id: string, month: number) {
    return saveUpdatedBooking(id, (booking) => ({
      ...booking,
      disbursements: booking.disbursements.map((item) =>
        item.month_number === month
          ? {
              ...item,
              status: "released",
              owner_requested_at: new Date().toISOString(),
              released_at: new Date().toISOString(),
            }
          : item
      ),
    }));
  },

  listConfirmedHousemates(listingId: string): Housemate[] {
    return readConfirmedHousemates()
      .filter((mate) => mate.listingId === listingId)
      .map(({ listingId: _listingId, renterId: _renterId, ...mate }) => mate);
  },
};
