"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  X,
  CloudUpload,
  Minus,
  Plus,
  Sparkles,
  Loader2,
  MapPin,
  AlertCircle,
} from "lucide-react";
import {
  LISTING_AMENITIES,
  LISTING_CATEGORIES,
  PROPERTY_TYPES,
  FURNISHING_OPTIONS,
} from "@/lib/constants";
import { api } from "@/lib/api";

type DescLang = "english" | "arabic" | "both";

interface FormState {
  title: string;
  category: string;
  property_type: string;
  full_address: string;
  price: string;
  size_sqm: string;
  bedrooms: number;
  bathrooms: number;
  floor_number: string;
  furnishing: string;
  amenities: string[];
  description: string;
  descLang: DescLang;
}

interface FormErrors {
  title?: string;
  full_address?: string;
  price?: string;
}

const INITIAL_FORM: FormState = {
  title: "",
  category: "for_rent",
  property_type: "Apartment",
  full_address: "",
  price: "",
  size_sqm: "",
  bedrooms: 3,
  bathrooms: 2,
  floor_number: "",
  furnishing: "",
  amenities: ["Parking"],
  description: "",
  descLang: "english",
};

interface AddListingModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AddListingModal({
  open,
  onClose,
  onSuccess,
}: AddListingModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});

  // Custom amenity state
  const [customAmenity, setCustomAmenity] = useState("");
  const [amenityError, setAmenityError] = useState("");
  const [checkingAmenity, setCheckingAmenity] = useState(false);

  // Photo state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  // AI description state
  const [generatingDesc, setGeneratingDesc] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAmenity(amenity: string) {
    setField(
      "amenities",
      form.amenities.includes(amenity)
        ? form.amenities.filter((a) => a !== amenity)
        : [...form.amenities, amenity]
    );
  }

  async function handleCustomAmenitySubmit() {
    const value = customAmenity.trim();
    if (!value) return;
    if (form.amenities.includes(value)) {
      setAmenityError("Already in the list");
      return;
    }

    setCheckingAmenity(true);
    setAmenityError("");
    try {
      const res = await api.post<{ ok: boolean; reason: string }>(
        "/api/ai/validate-amenity",
        { amenity: value }
      );
      if (res.ok) {
        setField("amenities", [...form.amenities, value]);
        setCustomAmenity("");
      } else {
        setAmenityError(`Flagged: ${res.reason}`);
      }
    } catch {
      // Network error → fail-open
      setField("amenities", [...form.amenities, value]);
      setCustomAmenity("");
    } finally {
      setCheckingAmenity(false);
    }
  }

  function handleFileSelect(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files);
    const newPreviews = arr.map((f) => URL.createObjectURL(f));
    setPhotoPreviews((prev) => [...prev, ...newPreviews]);
    setPhotoFiles((prev) => [...prev, ...arr]);
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviews[index]);
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== index));
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadPhotos(): Promise<string[]> {
    const urls: string[] = [];
    for (const file of photoFiles) {
      try {
        const { upload_url, public_url } = await api.post<{
          upload_url: string;
          public_url: string;
        }>("/api/uploads/signed-url", {
          bucket: "listing-images",
          filename: file.name,
        });
        await fetch(upload_url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        urls.push(public_url);
      } catch {
        // skip failed uploads — listing still saves without that photo
      }
    }
    return urls;
  }

  async function generateDescription() {
    setGeneratingDesc(true);
    try {
      const city = form.full_address || "Cairo";
      const extraParts: string[] = [];
      if (form.furnishing) extraParts.push(`Furnishing: ${form.furnishing}`);
      if (form.floor_number) extraParts.push(`Floor: ${form.floor_number}`);
      if (form.full_address) extraParts.push(`Address: ${form.full_address}`);
      extraParts.push(`Language preference: ${form.descLang}`);

      const res = await api.post<{
        english?: string;
        arabic?: string;
        description?: string;
      }>("/api/ai/description", {
        title: form.title || "Untitled",
        city,
        category: form.category,
        property_type: form.property_type,
        price: form.price ? Number(form.price) : null,
        size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        amenities: form.amenities,
        extra_notes: extraParts.join(". "),
      });
      const parts: string[] = [];
      if (form.descLang === "english" || form.descLang === "both") {
        if (res.english) parts.push(res.english);
        else if (res.description) parts.push(res.description);
      }
      if (form.descLang === "arabic" || form.descLang === "both") {
        if (res.arabic) parts.push(res.arabic);
      }
      setField("description", parts.join("\n\n"));
    } catch {
      // silently fail — user can retry
    } finally {
      setGeneratingDesc(false);
    }
  }

  function validate(): boolean {
    const newErrors: FormErrors = {};
    if (!form.title.trim()) newErrors.title = "Listing name is required";
    if (!form.full_address.trim())
      newErrors.full_address = "Address is required";
    if (!form.price || Number(form.price) <= 0)
      newErrors.price = "Enter a price greater than 0";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function submitListing() {
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError("");
    try {
      const images = await uploadPhotos();
      await api.post("/api/listings", {
        title: form.title.trim(),
        full_address: form.full_address,
        location: form.full_address,
        city: form.full_address,
        price: Number(form.price),
        size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
        category: form.category,
        property_type: form.property_type.toLowerCase(),
        bedrooms: form.bedrooms,
        bathrooms: form.bathrooms,
        floor_number: form.floor_number ? Number(form.floor_number) : null,
        furnishing: form.furnishing ? form.furnishing.toLowerCase() : null,
        description: form.description,
        amenities: form.amenities,
        images,
      });
      onSuccess?.();
      onClose();
      setForm(INITIAL_FORM);
      setPhotoPreviews([]);
      setPhotoFiles([]);
    } catch {
      setSubmitError("Failed to save listing. Make sure the backend is running.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const customAmenities = form.amenities.filter(
    (a) => !(LISTING_AMENITIES as readonly string[]).includes(a)
  );

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

          {/* Form body */}
          <div className="px-4 py-6 sm:px-8 space-y-8 max-h-[70vh] overflow-y-auto">

            {/* ── Section 1: Basics ── */}
            <section className="space-y-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Basics
              </p>

              {/* Listing Name */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">
                  Listing Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setField("title", e.target.value);
                    setErrors((p) => ({ ...p, title: undefined }));
                  }}
                  placeholder="e.g. Modern Apartment in Maadi"
                  className={`w-full bg-input-dark border rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm ${
                    errors.title ? "border-red-500" : "border-white/10"
                  }`}
                />
                {errors.title && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Category + Property Type */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Listing Category
                  </label>
                  <select
                    value={form.category}
                    onChange={(e) => setField("category", e.target.value)}
                    className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm appearance-none cursor-pointer"
                  >
                    {LISTING_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Property Type
                  </label>
                  <select
                    value={form.property_type}
                    onChange={(e) => setField("property_type", e.target.value)}
                    className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm appearance-none cursor-pointer"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="border-t border-white/5" />

            {/* ── Section 2: Location ── */}
            <section className="space-y-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Location
              </p>

              <div className="space-y-1.5 relative">
                <label className="block text-sm font-medium text-gray-300">
                  Address <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                  <input
                    type="text"
                    value={form.full_address}
                    onChange={(e) => {
                      setField("full_address", e.target.value);
                      setErrors((p) => ({ ...p, full_address: undefined }));
                    }}
                    placeholder="Enter property address…"
                    className={`w-full bg-input-dark border rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm ${
                      errors.full_address ? "border-red-500" : "border-white/10"
                    }`}
                  />
                </div>
                {errors.full_address && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.full_address}
                  </p>
                )}
              </div>
            </section>

            <div className="border-t border-white/5" />

            {/* ── Section 3: Property Details ── */}
            <section className="space-y-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Property Details
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Price */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Price <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 text-xs font-medium">
                      EGP
                    </span>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => {
                        setField("price", e.target.value);
                        setErrors((p) => ({ ...p, price: undefined }));
                      }}
                      placeholder="0"
                      className={`w-full bg-input-dark border rounded-xl pl-12 pr-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm ${
                        errors.price ? "border-red-500" : "border-white/10"
                      }`}
                    />
                  </div>
                  {errors.price && (
                    <p className="text-red-400 text-xs flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {errors.price}
                    </p>
                  )}
                </div>

                {/* Size */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Size
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={form.size_sqm}
                      onChange={(e) => setField("size_sqm", e.target.value)}
                      placeholder="0"
                      className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                    />
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 text-xs font-medium">
                      sqm
                    </span>
                  </div>
                </div>

                {/* Floor */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Floor
                  </label>
                  <input
                    type="number"
                    value={form.floor_number}
                    onChange={(e) => setField("floor_number", e.target.value)}
                    placeholder="e.g. 3"
                    className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Rooms */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Rooms
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setField("bedrooms", Math.max(0, form.bedrooms - 1))
                      }
                      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center text-white font-bold">
                      {form.bedrooms}
                    </span>
                    <button
                      type="button"
                      onClick={() => setField("bedrooms", form.bedrooms + 1)}
                      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Bathrooms */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Bathrooms
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setField("bathrooms", Math.max(0, form.bathrooms - 1))
                      }
                      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center text-white font-bold">
                      {form.bathrooms}
                    </span>
                    <button
                      type="button"
                      onClick={() => setField("bathrooms", form.bathrooms + 1)}
                      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 text-white flex items-center justify-center border border-white/5 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Furnishing */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-300">
                    Furnishing
                  </label>
                  <select
                    value={form.furnishing}
                    onChange={(e) => setField("furnishing", e.target.value)}
                    className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm appearance-none cursor-pointer"
                  >
                    <option value="">— Select —</option>
                    {FURNISHING_OPTIONS.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <div className="border-t border-white/5" />

            {/* ── Section 4: Amenities ── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Amenities
              </p>

              <div className="flex flex-wrap gap-2">
                {/* Preset chips */}
                {LISTING_AMENITIES.map((amenity) => {
                  const active = form.amenities.includes(amenity);
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

                {/* Custom amenity chips */}
                {customAmenities.map((amenity) => (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className="px-3 py-1.5 rounded-full text-xs font-medium bg-primary text-white border border-primary transition-all shadow-sm shadow-primary/20 flex items-center gap-1"
                  >
                    {amenity}
                    <X className="h-3.5 w-3.5" />
                  </button>
                ))}
              </div>

              {/* Custom amenity input */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customAmenity}
                    onChange={(e) => {
                      setCustomAmenity(e.target.value);
                      setAmenityError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCustomAmenitySubmit();
                      }
                    }}
                    placeholder="Add custom amenity… (press Enter)"
                    disabled={checkingAmenity}
                    className="flex-1 bg-input-dark border border-dashed border-white/20 rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm disabled:opacity-50"
                  />
                  {checkingAmenity && (
                    <Loader2 className="h-4 w-4 text-gray-400 animate-spin shrink-0" />
                  )}
                </div>
                {amenityError && (
                  <p className="text-red-400 text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {amenityError}
                  </p>
                )}
              </div>
            </section>

            <div className="border-t border-white/5" />

            {/* ── Section 5: Photos ── */}
            <section className="space-y-3">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Photos
              </p>

              <div
                className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFileSelect(e.dataTransfer.files);
                }}
              >
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="p-3 bg-white/5 rounded-full group-hover:bg-primary/10 transition-colors">
                    <CloudUpload className="h-6 w-6 text-gray-400 group-hover:text-primary" />
                  </div>
                  <p className="text-sm text-gray-300 font-medium">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">
                    PNG, JPG or WEBP (max 10 MB each)
                  </p>
                </div>
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />

              {/* Thumbnail previews */}
              {photoPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {photoPreviews.map((src, i) => (
                    <div
                      key={i}
                      className="relative group rounded-xl overflow-hidden aspect-video bg-black/20"
                    >
                      <Image
                        src={src}
                        alt={`Photo ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(i)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="border-t border-white/5" />

            {/* ── Section 6: Description ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                  Description
                </p>
                <div className="flex items-center gap-2">
                  {/* Language toggle */}
                  <div className="flex items-center bg-black/20 rounded-lg p-0.5 border border-white/10">
                    {(["english", "arabic", "both"] as DescLang[]).map(
                      (lang) => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setField("descLang", lang)}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-medium capitalize transition-all ${
                            form.descLang === lang
                              ? "bg-primary text-white"
                              : "text-gray-400 hover:text-white"
                          }`}
                        >
                          {lang}
                        </button>
                      )
                    )}
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
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                rows={4}
                placeholder="Describe the property details, or click 'Generate with AI'…"
                className="w-full bg-input-dark border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-sm resize-none"
              />
            </section>
          </div>

          {/* Footer */}
          <div className="bg-black/20 px-4 py-5 sm:px-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-gray-500 shrink-0">
              Listings are reviewed by an admin before going live.
            </p>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              {submitError && (
                <p className="text-red-400 text-xs flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {submitError}
                </p>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-white/10 text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitListing}
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-sm font-bold text-white shadow-lg shadow-primary/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Submit for Review"
                )}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
