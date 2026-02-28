"use client";

import { useState } from "react";
import { LayoutGrid, LayoutList, Loader2, Sparkles, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import FilterSidebar from "@/components/find-homes/FilterSidebar";
import SearchListingCard from "@/components/find-homes/SearchListingCard";
import SearchListingRow from "@/components/find-homes/SearchListingRow";
import Pagination from "@/components/find-homes/Pagination";
import { listingsQueries } from "@/lib/queries";
import { api } from "@/lib/api";
import type { Listing } from "@/types";
import type { ListingBrief } from "@/types/api";

const SORT_OPTIONS = [
  { label: "Recommended", value: "newest" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Most Viewed", value: "most_viewed" },
];

function mapToListing(l: ListingBrief): Listing {
  return {
    id: l.id,
    title: l.title,
    location: l.location,
    price: l.price,
    image: l.images[0] ?? "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800",
    matchPercent: 0,
    verified: l.verified,
    filledSpots: 0,
    totalSpots: 1,
    tags: [],
    avatars: [],
    liked: false,
  };
}

interface ParsedFilters {
  location?: string | null;
  max_price?: number | null;
  min_price?: number | null;
  property_type?: string | null;
  category?: string | null;
  bedrooms?: number | null;
  vibes?: string[];
  amenities?: string[];
}

interface NLSearchResponse {
  query: string;
  parsed_filters: ParsedFilters;
  results: ListingBrief[];
  total: number;
}

export default function FindHomesPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // AI search state
  const [aiMode, setAiMode] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiInput, setAiInput] = useState("");
  const [aiResults, setAiResults] = useState<NLSearchResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const { data, isLoading, isError } = useQuery({
    ...listingsQueries.list({ sort_by: sortBy, page: currentPage, per_page: 12 }),
    enabled: !aiMode,
  });

  const listings = (data?.listings ?? []).map(mapToListing);
  const totalPages = data ? Math.ceil(data.total / data.per_page) : 1;

  async function runAiSearch() {
    const q = aiInput.trim();
    if (!q) return;
    setAiLoading(true);
    setAiError("");
    setAiResults(null);
    setAiQuery(q);
    try {
      const res = await api.post<NLSearchResponse>("/api/ai/search", {
        query: q,
        limit: 20,
      });
      setAiResults(res);
    } catch {
      setAiError("AI search failed. Make sure the backend and Ollama are running.");
    } finally {
      setAiLoading(false);
    }
  }

  function exitAiMode() {
    setAiMode(false);
    setAiInput("");
    setAiQuery("");
    setAiResults(null);
    setAiError("");
  }

  const aiListings = (aiResults?.results ?? []).map(mapToListing);
  const parsedFilters = aiResults?.parsed_filters;

  function ListingGrid({ items }: { items: Listing[] }) {
    if (viewMode === "list") {
      return (
        <div className="flex flex-col gap-4">
          {items.map((listing, i) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.35 }}
            >
              <SearchListingRow listing={listing} />
            </motion.div>
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {items.map((listing, i) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.4 }}
          >
            <SearchListingCard listing={listing} />
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <main className="flex h-[calc(100vh-64px)] overflow-hidden w-full">
      {!aiMode && <FilterSidebar />}

      <section className="flex-1 h-full overflow-y-auto custom-scrollbar p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">Find Homes</h1>
            <p className="text-sm text-gray-400">
              {aiMode
                ? aiResults
                  ? `${aiResults.total} AI results for "${aiQuery}"`
                  : "Describe what you're looking for"
                : isLoading
                ? "Loading properties…"
                : `Showing ${data?.total ?? 0} properties`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* AI mode toggle */}
            <button
              onClick={() => (aiMode ? exitAiMode() : setAiMode(true))}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                aiMode
                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/25"
                  : "bg-card-dark border-white/10 text-gray-300 hover:border-primary/50 hover:text-primary"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              Smart Search
            </button>

            {!aiMode && (
              <>
                {/* View mode toggle */}
                <div className="flex items-center bg-card-dark rounded-lg p-1 border border-white/5">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors ${
                      viewMode === "grid"
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" /> Grid
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-colors ${
                      viewMode === "list"
                        ? "bg-white/10 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    <LayoutList className="h-3.5 w-3.5" /> List
                  </button>
                </div>

                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-card-dark border-white/5 text-gray-300 text-xs rounded-lg py-2 px-3 focus:ring-primary border"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        </div>

        {/* AI Search bar */}
        <AnimatePresence>
          {aiMode && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="mb-6"
            >
              <div className="relative flex gap-3">
                <div className="relative flex-1">
                  <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && runAiSearch()}
                    placeholder='e.g. "quiet 2-bedroom near Maadi under 8000 EGP"'
                    className="w-full bg-card-dark border border-primary/40 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                    autoFocus
                  />
                </div>
                <button
                  onClick={runAiSearch}
                  disabled={aiLoading || !aiInput.trim()}
                  className="px-5 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25"
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </button>
                <button
                  onClick={exitAiMode}
                  className="p-3 rounded-xl border border-white/10 text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Parsed intent chips */}
              {parsedFilters && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2 mt-3"
                >
                  <span className="text-xs text-gray-500 self-center">Understood:</span>
                  {parsedFilters.location && (
                    <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                      📍 {parsedFilters.location}
                    </span>
                  )}
                  {parsedFilters.max_price && (
                    <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                      💰 Max {parsedFilters.max_price.toLocaleString()} EGP
                    </span>
                  )}
                  {parsedFilters.bedrooms && (
                    <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                      🛏 {parsedFilters.bedrooms} bedrooms
                    </span>
                  )}
                  {parsedFilters.property_type && (
                    <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                      🏠 {parsedFilters.property_type}
                    </span>
                  )}
                  {parsedFilters.category && (
                    <span className="px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary font-medium">
                      🏢 {parsedFilters.category}
                    </span>
                  )}
                  {(parsedFilters.vibes ?? []).map((v) => (
                    <span
                      key={v}
                      className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-gray-300"
                    >
                      ✨ {v}
                    </span>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading states */}
        {(isLoading && !aiMode) || (aiLoading && aiMode) ? (
          <div className="flex items-center justify-center py-32">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              {aiLoading && (
                <p className="text-sm text-gray-400">AI is parsing your query…</p>
              )}
            </div>
          </div>
        ) : null}

        {/* Error states */}
        {isError && !aiMode && (
          <p className="text-center text-red-400 py-20">
            Failed to load listings. Make sure the backend is running.
          </p>
        )}
        {aiError && (
          <p className="text-center text-red-400 py-20">{aiError}</p>
        )}

        {/* Regular listings */}
        {!isLoading && !isError && !aiMode && (
          <>
            {listings.length === 0 ? (
              <p className="text-center text-gray-500 py-20">No listings found.</p>
            ) : (
              <ListingGrid items={listings} />
            )}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}

        {/* AI search results */}
        {aiMode && !aiLoading && aiResults && (
          <>
            {aiListings.length === 0 ? (
              <p className="text-center text-gray-500 py-20">
                No listings matched your query. Try rephrasing.
              </p>
            ) : (
              <ListingGrid items={aiListings} />
            )}
          </>
        )}

        {/* AI mode idle state */}
        {aiMode && !aiLoading && !aiResults && !aiError && (
          <div className="flex flex-col items-center justify-center py-32 gap-4 text-center">
            <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <p className="text-white font-semibold">Describe your ideal home</p>
            <p className="text-sm text-gray-400 max-w-sm">
              Type in plain language — location, budget, size, vibe. The AI will find the best matches for you.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
