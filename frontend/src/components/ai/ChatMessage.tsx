"use client";

import Image from "next/image";
import Link from "next/link";
import { Sparkles, User, BedDouble, Maximize2, ArrowRight } from "lucide-react";
import type { Citation } from "@/types";

export interface ListingRef {
  id: string;
  title: string;
  location: string;
  price: number;
  currency: string;
  bedrooms: number | null;
  size_sqm: number | null;
  images: string[];
}

export interface ChatMessageData {
  id: string;
  role: "user" | "assistant";
  content: string;
  listing_refs?: ListingRef[];
  citations?: Citation[];
  timestamp: Date;
}

function formatPrice(price: number, currency: string) {
  return `${price.toLocaleString("en-EG")} ${currency}`;
}

function ListingRefCard({ listing }: { listing: ListingRef }) {
  return (
    <Link
      href={`/property/${listing.id}`}
      className="flex items-center gap-3 bg-card border border-border rounded-lg p-2.5 hover:border-primary/50 hover:shadow-md hover:shadow-primary/10 transition-all group"
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-14 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        {listing.images?.[0] ? (
          <Image
            src={listing.images[0]}
            alt={listing.title}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="w-full h-full bg-secondary flex items-center justify-center">
            <BedDouble className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {listing.title}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {listing.location}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {listing.bedrooms != null && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <BedDouble className="w-3 h-3" />
              {listing.bedrooms}
            </span>
          )}
          {listing.size_sqm != null && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Maximize2 className="w-3 h-3" />
              {listing.size_sqm}m²
            </span>
          )}
        </div>
        <p className="text-xs font-bold text-primary mt-1">
          {formatPrice(listing.price, listing.currency)}
        </p>
      </div>

      {/* Arrow */}
      <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
    </Link>
  );
}

interface ChatMessageProps {
  message: ChatMessageData;
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
          isUser
            ? "bg-secondary text-muted-foreground"
            : "bg-primary text-white"
        }`}
      >
        {isUser ? (
          <User className="w-3.5 h-3.5" />
        ) : (
          <Sparkles className="w-3.5 h-3.5" />
        )}
      </div>

      {/* Bubble + listing cards */}
      <div
        className={`flex flex-col gap-2 max-w-[82%] ${isUser ? "items-end" : "items-start"}`}
      >
        {/* Text bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-primary text-white rounded-tr-sm"
              : "bg-secondary text-foreground rounded-tl-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Inline listing reference cards */}
        {message.listing_refs && message.listing_refs.length > 0 && (
          <div className="flex flex-col gap-2 w-full">
            {message.listing_refs.map((listing) => (
              <ListingRefCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Typing indicator shown while AI is responding */
export function TypingIndicator() {
  return (
    <div className="flex gap-2.5 flex-row">
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-secondary rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}
