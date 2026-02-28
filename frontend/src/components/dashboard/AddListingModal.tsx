"use client";

import { useState, useRef } from "react";
import { X, CloudUpload, Minus, Plus, Sparkles, Loader2, CheckCircle } from "lucide-react";
import { LISTING_AMENITIES } from "@/lib/constants";
import { api } from "@/lib/api";

type DescLang = "english" | "arabic" | "both";

interface AddListingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddListingModal({ open, onClose, onSuccess }: AddListingModalProps) {
  const [rooms, setRooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(["Parking"]);

  // Form field refs for AI description generation
  const nameRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const priceRef = useRef<HTMLInputElement>(null);
  const sizeRef = useRef<HTMLInputElement>(null);
  const typeRef = useRef<HTMLSelectElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  // AI description state
  const [descLang, setDescLang] = useState<DescLang>("english");
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  async function generateDescription() {
    setGeneratingDesc(true);
    try {
      const typeValue = typeRef.current?.value ?? "";
      const propertyTypeMap: Record<string, string> = {
        "For Sale": "buy",
        "For Rent": "rent",
        "Shared Housing": "shared",
      };
      const res = await api.post<{ english?: string; arabic?: string; description?: string }>(
        "/api/ai/generate-description",
        {
          title: nameRef.current?.value || null,
          full_address: addressRef.current?.value || null,
          property_type: propertyTypeMap[typeValue] ?? "rent",
          price: priceRef.current?.value ? Number(priceRef.current.value) : null,
          size_sqm: sizeRef.current?.value ? Number(sizeRef.current.value) : null,
          bedrooms: rooms,
          bathrooms,
          amenities: selectedAmenities,
          notes: `Language preference: ${descLang}`,
        }
      );
      if (descRef.current) {
        const parts: string[] = [];
        if (descLang === "english" || descLang === "both") {
          if (res.english) parts.push(res.english);
          else if (res.description) parts.push(res.description);
        }
        if (descLang === "arabic" || descLang === "both") {
          if (res.arabic) parts.push(res.arabic);
        }
        descRef.current.value = parts.join("\n\n");
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setGeneratingDesc(false);
    }
  }

  function toggleAmenity(amenity: string) {
    setSelectedAmenities((prev) =>
      prev.includes(amenity)
        ? prev.filter((a) => a !== amenity)
        : [...prev, amenity]
    );
  }

  async function submitListing(status: "draft" | "active") {
    const title = nameRef.current?.value?.trim();
    const full_address = addressRef.current?.value?.trim();
    const priceVal = priceRef.current?.value;
    const sizeVal = sizeRef.current?.value;
    const typeVal = typeRef.current?.value ?? "For Rent";
    const description = descRef.current?.value?.trim();

    if (!title || !full_address) {
      setSubmitError("Listing name and address are required.");
      return;
    }

    const categoryMap: Record<string, string> = {
      "For Sale": "buy",
      "For Rent": "rent",
      "Shared Housing": "shared",
    };

    setSubmitting(true);
    setSubmitError("");
    try {
      await api.post("/api/listings", {
        title,
        full_address,
        location: full_address,
        price: priceVal ? Number(priceVal) : 0,
        size_sqm: sizeVal ? Number(sizeVal) : null,
        category: categoryMap[typeVal] ?? "rent",
        bedrooms: rooms,
        bathrooms,
        description: description ?? "",
        amenities: selectedAmenities,
        status,
      });
      setSubmitted(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
        setSubmitted(false);
      }, 1200);
    } catch {
      setSubmitError("Failed to save listing. Make sure the backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto" role="dialog" aria-modal="true">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="flex min-h-screen items-center justify-center p-4 sm:p-0">
        <div className="relative transform overflow-hidden rounded-3xl bg-card-dark text-left shadow-2xl sm:my-8 sm:w-full sm:max-w-3xl border border-white/10">
          {/* Header */}
          <div className="bg-black/20 px-4 py-5 sm:px-8 border-b border-white/5 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Add New Listing</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-white/5"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <div className="px-4 py-6 sm:px-8 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Name + Address */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Listing Name
                </label>
                <input
                  ref={nameRef}
                  type="text"
                  placeholder="e.g. Modern Loft in Downtown"
                  className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Address
                </label>
                <input
                  ref={addressRef}
                  type="text"
                  placeholder="Street, City, Zip"
                  className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                />
              </div>
            </div>

            {/* Photos */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Photos Upload
              </label>
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer group">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-white/5 rounded-full group-hover:bg-primary/10 transition-colors">
                    <CloudUpload className="h-6 w-6 text-gray-400 group-hover:text-primary" />
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    SVG, PNG, JPG or GIF (max. 800x400px)
                  </p>
                </div>
              </div>
            </div>

            {/* Price / Size / Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Price
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-xs font-medium">
                    EGP
                  </span>
                  <input
                    ref={priceRef}
                    type="number"
                    placeholder="0"
                    className="w-full bg-input-dark border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Size
                </label>
                <div className="relative">
                  <input
                    ref={sizeRef}
                    type="number"
                    placeholder="2500"
                    className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                  />
                  <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 text-xs font-medium">
                    sqft
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Property Type
                </label>
                <select
                  ref={typeRef}
                  className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm appearance-none cursor-pointer"
                >
                  <option>For Sale</option>
                  <option>For Rent</option>
                  <option>Shared Housing</option>
                </select>
              </div>
            </div>

            {/* Rooms / Bathrooms counter */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Rooms
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRooms(Math.max(0, rooms - 1))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-white font-bold">
                    {rooms}
                  </span>
                  <button
                    type="button"
                    onClick={() => setRooms(rooms + 1)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Bathrooms
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setBathrooms(Math.max(0, bathrooms - 1))}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-12 text-center text-white font-bold">
                    {bathrooms}
                  </span>
                  <button
                    type="button"
                    onClick={() => setBathrooms(bathrooms + 1)}
                    className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Amenities
              </label>
              <div className="flex flex-wrap gap-2">
                {LISTING_AMENITIES.map((amenity) => {
                  const active = selectedAmenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={
                        active
                          ? "px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-white border border-primary transition-all shadow-sm shadow-primary/20 flex items-center gap-1"
                          : "px-3 py-1.5 rounded-full text-xs font-medium bg-input-dark text-gray-300 border border-white/10 hover:border-white/30 hover:bg-[#333] transition-all"
                      }
                    >
                      {amenity}
                      {active && <X className="h-3.5 w-3.5" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/5 text-gray-400 border border-dashed border-white/20 hover:border-primary hover:text-primary transition-all flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>

            {/* Description + AI Generator */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-300">
                  Description
                </label>
                <div className="flex items-center gap-2">
                  {/* Language toggle */}
                  <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-white/10">
                    {(["english", "arabic", "both"] as DescLang[]).map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setDescLang(lang)}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-all ${
                          descLang === lang
                            ? "bg-primary text-white"
                            : "text-gray-400 hover:text-white"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                  {/* Generate button */}
                  <button
                    type="button"
                    onClick={generateDescription}
                    disabled={generatingDesc}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {generatingDesc ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Generate with AI
                  </button>
                </div>
              </div>
              <textarea
                ref={descRef}
                rows={4}
                placeholder="Describe the property details, or click 'Generate with AI'…"
                className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm resize-none"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="bg-black/20 px-4 py-5 sm:px-8 border-t border-white/5 flex flex-col sm:flex-row justify-end gap-3">
            {submitError && (
              <p className="text-red-400 text-xs self-center mr-auto">{submitError}</p>
            )}
            {submitted && (
              <p className="text-green-400 text-xs self-center mr-auto flex items-center gap-1">
                <CheckCircle className="h-4 w-4" /> Listing saved!
              </p>
            )}
            <p className="text-xs text-gray-500 self-center mr-auto">
              Listings are reviewed by an admin before going live.
            </p>
            <button
              type="button"
              onClick={() => submitListing("draft")}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Save as Draft"}
            </button>
            <button
              type="button"
              onClick={() => submitListing("active")}
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for Review"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
