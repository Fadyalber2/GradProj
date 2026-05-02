"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getStats, listItems, deleteItem, updateItem, createItem, reviewFraud } from "@/lib/admin/api";
import { supabase } from "@/lib/supabase";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import EntityPicker from "@/components/admin/EntityPicker";
import RichTextEditor from "@/components/admin/RichTextEditor";
import Image from "next/image";
import {
  Users, Home, Building2, Briefcase, FolderOpen,
  TrendingUp, AlertTriangle, Clock, CheckCircle,
  Search, Plus, RefreshCw, X, ChevronRight, Trash2,
  BedDouble, Upload, Loader2, PhoneCall,
} from "lucide-react";
import type { ElementType } from "react";

const STORAGE_BUCKET = "agency-images";

// ── Helpers ────────────────────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
    gray: "bg-slate-100 text-slate-500",
    yellow: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, sub, onClick }: {
  label: string;
  value: number | string;
  icon: ElementType;
  color: string;
  sub?: string;
  onClick?: () => void;
}) {
  const colors: Record<string, { accent: string; iconBg: string; icon: string; value: string }> = {
    blue:   { accent: "bg-blue-500",   iconBg: "bg-blue-50",   icon: "text-blue-600",   value: "text-slate-900" },
    green:  { accent: "bg-emerald-500", iconBg: "bg-emerald-50", icon: "text-emerald-600", value: "text-slate-900" },
    purple: { accent: "bg-purple-500", iconBg: "bg-purple-50", icon: "text-purple-600", value: "text-slate-900" },
    orange: { accent: "bg-orange-500", iconBg: "bg-orange-50", icon: "text-orange-600", value: "text-slate-900" },
    red:    { accent: "bg-red-500",    iconBg: "bg-red-50",    icon: "text-red-600",    value: "text-slate-900" },
  };
  const c = colors[color] ?? colors.blue;

  const inner = (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4 relative overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${c.accent}`} />
      <div className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${c.icon}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold ${c.value} leading-none mt-0.5`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
      </div>
      {onClick && (
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0" />
      )}
    </div>
  );

  if (onClick) {
    return (
      <button onClick={onClick} className="text-left group w-full">
        {inner}
      </button>
    );
  }
  return inner;
}

function formatDate(val: unknown): string {
  if (!val) return "—";
  try { return new Date(String(val)).toLocaleDateString("en-GB"); } catch { return String(val); }
}

function formatPrice(val: unknown): string {
  if (!val) return "—";
  return Number(val).toLocaleString("en-EG") + " EGP";
}

// ── Section configs ────────────────────────────────────────────────────────────

type FieldDef = {
  key: string;
  label: string;
  type?: "text" | "number" | "url" | "textarea" | "select" | "richtext" | "picker" | "image_url";
  options?: string[];
  pickerSection?: "users" | "agencies" | "projects";
  /** Key of another field whose value is passed as a filter param to this picker. */
  dependsOn?: string;
  required?: boolean;
};

interface SectionConfig {
  title: string;
  apiSection: string;
  columns: Column[];
  searchPlaceholder: string;
  editFields: FieldDef[];
  createFields?: FieldDef[];
  canCreate?: boolean;
  extraFilters?: FieldDef[];
  readOnly?: boolean;
}

const SECTIONS: Record<string, SectionConfig> = {
  users: {
    title: "Users",
    apiSection: "users",
    searchPlaceholder: "Search by name…",
    extraFilters: [{ key: "role", label: "Role", type: "select", options: ["user", "admin"] }],
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      {
        key: "role", label: "Role",
        render: (v) => <Badge color={v === "admin" ? "red" : "blue"}>{String(v ?? "user")}</Badge>,
      },
      { key: "phone", label: "Phone" },
      { key: "created_at", label: "Joined", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "full_name", label: "Full Name" },
      { key: "phone", label: "Phone" },
      { key: "role", label: "Role", type: "select", options: ["user", "admin"] },
      { key: "bio", label: "Bio", type: "textarea" },
    ],
  },
  listings: {
    title: "Listings",
    apiSection: "listings",
    searchPlaceholder: "Search by title…",
    canCreate: true,
    extraFilters: [
      { key: "status", label: "Status", type: "select", options: ["active", "pending", "draft", "sold", "rented"] },
      { key: "property_type", label: "Type", type: "select", options: ["apartment", "villa", "studio", "duplex", "penthouse", "chalet", "land", "commercial"] },
    ],
    columns: [
      { key: "title", label: "Title" },
      { key: "price", label: "Price", render: (v) => formatPrice(v) },
      { key: "location", label: "Location" },
      { key: "property_type", label: "Type", render: (v) => <Badge color="purple">{String(v ?? "")}</Badge> },
      {
        key: "category", label: "Category",
        render: (v) => {
          const map: Record<string, string> = { for_rent: "For Rent", for_sale: "For Sale", shared_housing: "Shared" };
          return <Badge color={v === "for_rent" ? "blue" : v === "for_sale" ? "green" : "yellow"}>{map[String(v)] ?? String(v ?? "")}</Badge>;
        },
      },
      { key: "bedrooms", label: "Beds" },
      {
        key: "status", label: "Status",
        render: (v) => <Badge color={v === "active" ? "green" : v === "pending" ? "yellow" : v === "sold" ? "blue" : "gray"}>{String(v ?? "")}</Badge>,
      },
      { key: "created_at", label: "Created", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "title", label: "Title" },
      { key: "price", label: "Price (EGP)", type: "number" },
      { key: "location", label: "Location" },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bathrooms", label: "Bathrooms", type: "number" },
      { key: "size_sqm", label: "Area (m²)", type: "number" },
      { key: "property_type", label: "Type", type: "select", options: ["apartment", "villa", "studio", "duplex", "penthouse", "chalet", "land", "commercial"] },
      { key: "category", label: "Category", type: "select", options: ["for_rent", "for_sale", "shared_housing"] },
      { key: "status", label: "Status", type: "select", options: ["active", "pending", "draft", "sold", "rented"] },
      { key: "description", label: "Description", type: "textarea" },
    ],
    createFields: [
      { key: "title", label: "Title" },
      { key: "price", label: "Price (EGP)", type: "number" },
      { key: "location", label: "Location" },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bathrooms", label: "Bathrooms", type: "number" },
      { key: "size_sqm", label: "Area (m²)", type: "number" },
      { key: "property_type", label: "Type", type: "select", options: ["apartment", "villa", "studio", "duplex", "penthouse", "chalet", "land", "commercial"] },
      { key: "category", label: "Category", type: "select", options: ["for_rent", "for_sale", "shared_housing"] },
      { key: "owner_id", label: "Owner (optional if Agency is set)", type: "picker", pickerSection: "users" },
      { key: "agency_id", label: "Agency (optional)", type: "picker", pickerSection: "agencies" },
      { key: "project_id", label: "Project (select Agency first)", type: "picker", pickerSection: "projects", dependsOn: "agency_id" },
      { key: "description", label: "Description", type: "textarea" },
    ],
  },
  agencies: {
    title: "Agencies",
    apiSection: "agencies",
    searchPlaceholder: "Search by name…",
    canCreate: true,
    columns: [
      { key: "name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "city", label: "City" },
      {
        key: "verified", label: "Verified",
        render: (v) => <Badge color={v ? "green" : "gray"}>{v ? "Verified" : "Unverified"}</Badge>,
      },
      { key: "created_at", label: "Created", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "logo_url", label: "Logo Image URL", type: "image_url" },
      { key: "banner_url", label: "Banner Image URL", type: "image_url" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
      { key: "website", label: "Website" },
      { key: "verified", label: "Verified", type: "select", options: ["true", "false"] },
    ],
    createFields: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug (leave blank to auto-generate)" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "logo_url", label: "Logo Image URL", type: "image_url" },
      { key: "banner_url", label: "Banner Image URL", type: "image_url" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "city", label: "City" },
      { key: "website", label: "Website" },
    ],
  },
  brokers: {
    title: "Brokers",
    apiSection: "brokers",
    searchPlaceholder: "Search by name…",
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "license_number", label: "License #" },
      { key: "total_deals", label: "Total Deals" },
      { key: "created_at", label: "Joined", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "full_name", label: "Full Name" },
      { key: "phone", label: "Phone" },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "license_number", label: "License Number" },
    ],
  },
  projects: {
    title: "Projects",
    apiSection: "projects",
    searchPlaceholder: "Search by name…",
    canCreate: true,
    columns: [
      { key: "title", label: "Project Name" },
      { key: "starting_price", label: "Starting Price", render: (v) => formatPrice(v) },
      { key: "units_total", label: "Units" },
      {
        key: "status", label: "Status",
        render: (v) => <Badge color={v === "completed" ? "green" : v === "in_progress" ? "yellow" : "gray"}>{String(v ?? "")}</Badge>,
      },
      { key: "created_at", label: "Created", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Cover Image URL", type: "image_url" },
      { key: "starting_price", label: "Starting Price (EGP)", type: "number" },
      { key: "units_total", label: "Total Units", type: "number" },
      { key: "completion_pct", label: "Completion %", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["upcoming", "in_progress", "completed"] },
    ],
    createFields: [
      { key: "title", label: "Title" },
      { key: "slug", label: "Slug (leave blank to auto-generate)" },
      { key: "agency_id", label: "Agency", type: "picker", pickerSection: "agencies", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "image_url", label: "Cover Image URL", type: "image_url" },
      { key: "starting_price", label: "Starting Price (EGP)", type: "number" },
      { key: "units_total", label: "Total Units", type: "number" },
      { key: "completion_pct", label: "Completion %", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["upcoming", "in_progress", "completed"] },
    ],
  },
  "shared-housing": {
    title: "Shared Housing",
    apiSection: "shared-housing",
    searchPlaceholder: "Search by title…",
    columns: [
      { key: "title", label: "Title" },
      { key: "location", label: "Location" },
      { key: "rent_per_person", label: "Rent/Person", render: (v) => formatPrice(v) },
      { key: "available_rooms", label: "Available" },
      { key: "total_rooms", label: "Total Rooms" },
      {
        key: "is_active", label: "Status",
        render: (v) => <Badge color={v ? "green" : "gray"}>{v ? "Active" : "Inactive"}</Badge>,
      },
      { key: "created_at", label: "Created", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "title", label: "Title" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "rent_per_person", label: "Rent Per Person (EGP)", type: "number" },
      { key: "location", label: "Location" },
      { key: "available_rooms", label: "Available Rooms", type: "number" },
      { key: "total_rooms", label: "Total Rooms", type: "number" },
      { key: "is_active", label: "Active", type: "select", options: ["true", "false"] },
    ],
  },
  blog: {
    title: "Blog Posts",
    apiSection: "blog",
    searchPlaceholder: "Search by title…",
    extraFilters: [{ key: "is_published", label: "Published", type: "select", options: ["true", "false"] }],
    canCreate: true,
    columns: [
      { key: "title", label: "Title" },
      { key: "category", label: "Category" },
      {
        key: "is_published", label: "Status",
        render: (v) => <Badge color={v ? "green" : "gray"}>{v ? "Published" : "Draft"}</Badge>,
      },
      { key: "created_at", label: "Created", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "title", label: "Title" },
      { key: "lead", label: "Lead / Summary", type: "textarea" },
      { key: "content", label: "Content", type: "richtext" },
      { key: "category", label: "Category" },
      { key: "is_published", label: "Published", type: "select", options: ["true", "false"] },
    ],
    createFields: [
      { key: "title", label: "Title" },
      { key: "author_id", label: "Author", type: "picker", pickerSection: "users", required: true },
      { key: "lead", label: "Lead / Summary", type: "textarea" },
      { key: "content", label: "Content", type: "richtext" },
      { key: "category", label: "Category" },
      { key: "is_published", label: "Published", type: "select", options: ["true", "false"] },
    ],
  },
  transactions: {
    title: "Transactions",
    apiSection: "transactions",
    searchPlaceholder: "Search…",
    readOnly: true,
    columns: [
      { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs text-slate-500">{String(v ?? "").slice(0, 8)}…</span> },
      { key: "amount", label: "Amount", render: (v) => formatPrice(v) },
      { key: "type", label: "Type" },
      {
        key: "status", label: "Status",
        render: (v) => <Badge color={v === "completed" ? "green" : v === "pending" ? "yellow" : "red"}>{String(v ?? "")}</Badge>,
      },
      { key: "created_at", label: "Date", render: (v) => formatDate(v) },
    ],
    editFields: [],
  },
  notifications: {
    title: "Notifications",
    apiSection: "notifications",
    searchPlaceholder: "Search…",
    readOnly: true,
    columns: [
      { key: "title", label: "Title" },
      { key: "message", label: "Message" },
      { key: "type", label: "Type" },
      {
        key: "is_read", label: "Read",
        render: (v) => <Badge color={v ? "gray" : "blue"}>{v ? "Read" : "Unread"}</Badge>,
      },
      { key: "created_at", label: "Date", render: (v) => formatDate(v) },
    ],
    editFields: [],
  },
  leads: {
    title: "Leads",
    apiSection: "leads",
    searchPlaceholder: "Search by buyer name…",
    readOnly: true,
    extraFilters: [
      { key: "source", label: "Source", type: "select", options: ["whatsapp_click", "schedule_viewing"] },
      { key: "is_billable", label: "Billable", type: "select", options: ["true", "false"] },
    ],
    columns: [
      { key: "contact_name", label: "Buyer Name" },
      { key: "contact_phone", label: "Phone" },
      { key: "listing_title", label: "Listing" },
      { key: "agency_name", label: "Agency" },
      {
        key: "source", label: "Source",
        render: (v) => (
          <Badge color={v === "schedule_viewing" ? "green" : "blue"}>
            {v === "schedule_viewing" ? "Viewing" : "Contact"}
          </Badge>
        ),
      },
      {
        key: "is_billable", label: "Billable",
        render: (v) => <Badge color={v ? "green" : "gray"}>{v ? "Yes" : "No"}</Badge>,
      },
      { key: "created_at", label: "Date", render: (v) => formatDate(v) },
    ],
    editFields: [],
  },
};

// ── Edit/Create Form ───────────────────────────────────────────────────────────

function EntityForm({
  fields,
  initial,
  onSave,
  onCancel,
  loading,
}: {
  fields: FieldDef[];
  initial?: Record<string, unknown>;
  onSave: (data: Record<string, unknown>) => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<Record<string, unknown>>(initial ?? {});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  function set(key: string, value: unknown) {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // Clear any fields that depend on this one
      fields.forEach((fd) => {
        if (fd.dependsOn === key) {
          next[fd.key] = "";
          next[`${fd.key}_label`] = "";
        }
      });
      return next;
    });
  }

  async function handleFileUpload(fieldKey: string, file: File) {
    setUploading((u) => ({ ...u, [fieldKey]: true }));
    setUploadErrors((e) => ({ ...e, [fieldKey]: "" }));
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${fieldKey}-${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(data.path);
      set(fieldKey, publicUrl);
    } catch (err) {
      setUploadErrors((e) => ({ ...e, [fieldKey]: err instanceof Error ? err.message : "Upload failed" }));
    } finally {
      setUploading((u) => ({ ...u, [fieldKey]: false }));
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.required) {
        const v = form[f.key];
        if (v === undefined || v === null || String(v).trim() === "") {
          newErrors[f.key] = `${f.label} is required`;
        }
      }
      if (f.type === "number" && form[f.key] !== undefined && form[f.key] !== "") {
        if (isNaN(Number(form[f.key]))) {
          newErrors[f.key] = `${f.label} must be a number`;
        }
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (k.endsWith("_label")) continue; // display-only, not a DB column
      if (v === "true") clean[k] = true;
      else if (v === "false") clean[k] = false;
      else clean[k] = v;
    }
    onSave(clean);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => {
        const fieldError = errors[field.key];
        return (
          <div key={field.key}>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">
              {field.label}
              {field.required && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            {field.type === "richtext" ? (
              <RichTextEditor
                value={String(form[field.key] ?? "")}
                onChange={(html) => set(field.key, html)}
              />
            ) : field.type === "image_url" ? (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={String(form[field.key] ?? "")}
                    onChange={(e) => set(field.key, e.target.value)}
                    placeholder="https://..."
                    className={`flex-1 px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-slate-400 ${fieldError ? "border-red-400" : "border-slate-200"}`}
                  />
                  <label className={`flex items-center gap-1.5 px-3 py-2.5 rounded-lg border text-sm font-semibold cursor-pointer transition ${uploading[field.key] ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed" : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"}`}>
                    {uploading[field.key] ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{uploading[field.key] ? "Uploading…" : "Upload"}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploading[field.key]}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(field.key, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {uploadErrors[field.key] && (
                  <p className="text-xs text-red-500">{uploadErrors[field.key]}</p>
                )}
                {String(form[field.key] ?? "").startsWith("http") && (
                  <div className="relative h-24 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                    <Image
                      src={String(form[field.key])}
                      alt="Preview"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                )}
              </div>
            ) : field.type === "picker" && field.pickerSection ? (
              <EntityPicker
                value={String(form[field.key] ?? "")}
                onChange={(id, label) => {
                  set(field.key, id);
                  setForm((f) => ({ ...f, [`${field.key}_label`]: label }));
                }}
                section={field.pickerSection}
                placeholder={`Search ${field.pickerSection}…`}
                displayValue={String(form[`${field.key}_label`] ?? "")}
                extraParams={
                  field.dependsOn
                    ? { [field.dependsOn]: String(form[field.dependsOn] ?? "") }
                    : undefined
                }
                disabled={field.dependsOn ? !form[field.dependsOn] : false}
              />
            ) : field.type === "textarea" ? (
              <textarea
                value={String(form[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                rows={3}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition placeholder:text-slate-400 ${fieldError ? "border-red-400" : "border-slate-200"}`}
              />
            ) : field.type === "select" ? (
              <select
                value={String(form[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${fieldError ? "border-red-400" : "border-slate-200"}`}
              >
                <option value="">— Select —</option>
                {field.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type ?? "text"}
                value={String(form[field.key] ?? "")}
                onChange={(e) => set(field.key, e.target.value)}
                className={`w-full px-3 py-2.5 rounded-lg border bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition placeholder:text-slate-400 ${fieldError ? "border-red-400" : "border-slate-200"}`}
              />
            )}
            {fieldError && (
              <p className="text-xs text-red-500 mt-1">{fieldError}</p>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-3 border-t border-slate-100 mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition"
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

// ── Section View ───────────────────────────────────────────────────────────────

function SectionView({ sectionId }: { sectionId: string }) {
  const config = SECTIONS[sectionId];
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [editRow, setEditRow] = useState<Record<string, unknown> | null>(null);
  const [creating, setCreating] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Record<string, unknown> | null>(null);
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const [viewRow, setViewRow] = useState<Record<string, unknown> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params: Record<string, string | number> = { page, per_page: 15 };
      if (search) params.search = search;
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await listItems<Record<string, unknown>>(config.apiSection, params);
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [config.apiSection, page, search, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!deleteTarget) { setDeleteCountdown(0); return; }
    setDeleteCountdown(3);
    const interval = setInterval(() => {
      setDeleteCountdown((n) => {
        if (n <= 1) { clearInterval(interval); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [deleteTarget]);

  async function handleSave(formData: Record<string, unknown>) {
    setModalLoading(true);
    setError("");
    try {
      if (editRow) {
        await updateItem(config.apiSection, String(editRow.id), formData);
        setEditRow(null);
      } else {
        await createItem(config.apiSection, formData);
        setCreating(false);
      }
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setModalLoading(true);
    try {
      await deleteItem(config.apiSection, String(deleteTarget.id));
      setDeleteTarget(null);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setModalLoading(false);
    }
  }

  if (!config) return <p className="text-slate-400 p-4">Section not configured</p>;

  const singularTitle = config.title.replace(/s$/, "");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">{config.title}</h2>
          {!loading && total > 0 && (
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {total.toLocaleString()} records
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={config.searchPlaceholder}
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-52 transition"
            />
          </div>

          {/* Extra filters */}
          {config.extraFilters?.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] ?? ""}
              onChange={(e) => { setFilters((prev) => ({ ...prev, [f.key]: e.target.value })); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">All {f.label}s</option>
              {f.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ))}

          {/* Refresh */}
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Add button */}
          {config.canCreate && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Add {singularTitle}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Table */}
      <AdminTable
        columns={config.columns}
        data={data}
        total={total}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        loading={loading}
        onEdit={config.readOnly ? undefined : (row) => setEditRow(row)}
        onDelete={config.readOnly ? undefined : (row) => setDeleteTarget(row)}
        onView={(row) => setViewRow(row)}
      />

      {/* Edit Modal */}
      <AdminModal
        title={`Edit ${singularTitle}`}
        open={!!editRow}
        onClose={() => setEditRow(null)}
        width={sectionId === "agencies" || sectionId === "projects" ? "max-w-2xl" : "max-w-lg"}
      >
        {editRow && (
          <EntityForm
            fields={config.editFields}
            initial={editRow}
            onSave={handleSave}
            onCancel={() => setEditRow(null)}
            loading={modalLoading}
          />
        )}
      </AdminModal>

      {/* Create Modal */}
      <AdminModal
        title={`Add New ${singularTitle}`}
        open={creating}
        onClose={() => setCreating(false)}
        width={sectionId === "agencies" || sectionId === "projects" ? "max-w-2xl" : "max-w-lg"}
      >
        <EntityForm
          fields={config.createFields ?? config.editFields}
          onSave={handleSave}
          onCancel={() => setCreating(false)}
          loading={modalLoading}
        />
      </AdminModal>

      {/* Delete Confirm */}
      <AdminModal title="Confirm Deletion" open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <div className="flex flex-col items-center text-center gap-4 pb-2">
          <div className="w-14 h-14 bg-red-50 border-2 border-red-100 rounded-full flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-base">
              Delete &ldquo;{String(deleteTarget?.title ?? deleteTarget?.name ?? deleteTarget?.full_name ?? "this record")}&rdquo;?
            </p>
            <p className="text-sm text-slate-500 mt-1">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={modalLoading || deleteCountdown > 0}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg text-sm transition"
          >
            {modalLoading
              ? "Deleting…"
              : deleteCountdown > 0
              ? `Wait (${deleteCountdown})`
              : "Yes, Delete"}
          </button>
        </div>
      </AdminModal>

      {/* View Modal */}
      <AdminModal title="Record Details" open={!!viewRow} onClose={() => setViewRow(null)} width="max-w-2xl">
        {viewRow && (
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(viewRow).map(([k, v]) => (
              <div key={k} className="col-span-1 bg-slate-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{k.replace(/_/g, " ")}</p>
                <p className="text-sm text-slate-800 mt-0.5 break-words">
                  {v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v)}
                </p>
              </div>
            ))}
          </div>
        )}
      </AdminModal>
    </div>
  );
}

// ── Pending Approvals View ─────────────────────────────────────────────────────

function PendingApprovalsView() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listItems<Record<string, unknown>>("listings", {
        status: "pending",
        page,
        per_page: 15,
      });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleApprove(id: string) {
    setActioning(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/admin/listings/${id}/approve`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
        },
      });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setActioning(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) return;
    setActioning(id);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}/api/admin/listings/${id}/reject`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("admin_token") ?? ""}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setRejectTarget(null);
      setRejectReason("");
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setActioning(null);
    }
  }

  const columns: Column[] = [
    { key: "title", label: "Listing" },
    { key: "price", label: "Price", render: (v) => formatPrice(v) },
    { key: "location", label: "Location" },
    { key: "property_type", label: "Type", render: (v) => <Badge color="purple">{String(v ?? "")}</Badge> },
    { key: "created_at", label: "Submitted", render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">Pending Approvals</h2>
          {!loading && total > 0 && (
            <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-2.5 py-1 rounded-full">
              {total} pending
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{col.label}</th>
                ))}
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5"><div className="h-4 bg-slate-100 rounded-full w-3/4" /></td>
                    ))}
                    <td className="px-4 py-3.5"><div className="h-7 bg-slate-100 rounded-lg w-36 ml-auto" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium text-sm">No pending listings</p>
                        <p className="text-slate-400 text-xs mt-0.5">All caught up!</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={String(row.id)} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5 text-slate-700">
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      {rejectTarget === String(row.id) ? (
                        <div className="flex items-center gap-2 justify-end">
                          <input
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason…"
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-red-400 w-36"
                          />
                          <button
                            onClick={() => handleReject(String(row.id))}
                            disabled={!rejectReason.trim() || actioning === String(row.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                            className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-700 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(String(row.id))}
                            disabled={actioning === String(row.id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectTarget(String(row.id))}
                            disabled={actioning === String(row.id)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className="text-xs text-slate-500">{total} pending listings</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition">
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
              <span className="text-xs text-slate-600 font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Fraud Queue View ───────────────────────────────────────────────────────────

function FraudView() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listItems<Record<string, unknown>>("fraud", { page, per_page: 15 });
      setData(res.data);
      setTotal(res.total);
      setTotalPages(res.total_pages);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioning(id);
    try {
      await reviewFraud(id, action);
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setActioning(null);
    }
  }

  const columns: Column[] = [
    { key: "title", label: "Listing" },
    { key: "price", label: "Price", render: (v) => formatPrice(v) },
    { key: "location", label: "Location" },
    {
      key: "fraud_score", label: "Fraud Score",
      render: (v) => {
        const score = Number(v ?? 0);
        const color = score > 0.7 ? "text-red-600" : score > 0.4 ? "text-orange-500" : "text-emerald-600";
        const bg = score > 0.7 ? "bg-red-50" : score > 0.4 ? "bg-orange-50" : "bg-emerald-50";
        return (
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${color} ${bg}`}>
            {(score * 100).toFixed(0)}%
          </span>
        );
      },
    },
    { key: "created_at", label: "Created", render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900">Fraud Queue</h2>
          {!loading && total > 0 && (
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
              {total} flagged
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-xl">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{col.label}</th>
                ))}
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3.5">
                        <div className="h-4 bg-slate-100 rounded-full w-3/4" />
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      <div className="h-7 bg-slate-100 rounded-lg w-28 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-slate-600 font-medium text-sm">No flagged listings</p>
                        <p className="text-slate-400 text-xs mt-0.5">All listings are clear</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr key={String(row.id)} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5 text-slate-700">
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(String(row.id), "approve")}
                          disabled={actioning === String(row.id)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleAction(String(row.id), "reject")}
                          disabled={actioning === String(row.id)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/60">
            <span className="text-xs text-slate-500">{total} flagged listings</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition">
                <ChevronRight className="w-3.5 h-3.5 rotate-180" />
              </button>
              <span className="text-xs text-slate-600 font-medium">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-white disabled:opacity-40 transition">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Dashboard Overview ─────────────────────────────────────────────────────────

function DashboardOverview({ onNavigate }: { onNavigate: (s: string) => void }) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats().then(setStats).catch(() => null).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Total Users", key: "total_users", icon: Users, color: "blue", section: "users" },
    { label: "Active Listings", key: "active_listings", icon: Home, color: "green", section: "listings" },
    { label: "Pending Review", key: "pending_listings", icon: Clock, color: "orange", section: "listings" },
    { label: "Flagged Fraud", key: "flagged_listings", icon: AlertTriangle, color: "red", section: "fraud" },
    { label: "Agencies", key: "total_agencies", icon: Building2, color: "purple", section: "agencies" },
    { label: "Projects", key: "total_projects", icon: FolderOpen, color: "blue", section: "projects" },
    { label: "Shared Housing", key: "total_shared_housing", icon: BedDouble, color: "green", section: "shared-housing" },
    { label: "Blog Posts", key: "total_blog_posts", icon: TrendingUp, color: "purple", section: "blog" },
  ];

  const quickActions = [
    { label: "Manage Users", section: "users", icon: Users, color: "blue" },
    { label: "Review Listings", section: "listings", icon: Home, color: "green" },
    { label: "Agencies", section: "agencies", icon: Building2, color: "purple" },
    { label: "Fraud Queue", section: "fraud", icon: AlertTriangle, color: "red" },
  ] as const;

  const actionColors = {
    blue:   { border: "border-blue-100",   bg: "bg-blue-50",   hover: "hover:border-blue-300 hover:bg-blue-100",   icon: "text-blue-600"   },
    green:  { border: "border-emerald-100", bg: "bg-emerald-50", hover: "hover:border-emerald-300 hover:bg-emerald-100", icon: "text-emerald-600" },
    purple: { border: "border-purple-100", bg: "bg-purple-50", hover: "hover:border-purple-300 hover:bg-purple-100", icon: "text-purple-600" },
    red:    { border: "border-red-100",    bg: "bg-red-50",    hover: "hover:border-red-300 hover:bg-red-100",       icon: "text-red-600"    },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900">Platform Overview</h2>
        <p className="text-sm text-slate-500 mt-0.5">Real-time snapshot of AXIOM platform activity.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statCards.map(({ label, key, icon, color, section }) => (
          <StatCard
            key={label}
            label={label}
            value={loading ? "—" : (stats?.[key as keyof typeof stats] ?? 0)}
            icon={icon}
            color={color}
            onClick={() => onNavigate(section)}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <h3 className="font-semibold text-slate-800 text-sm mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickActions.map(({ label, section, icon: Icon, color }) => {
            const c = actionColors[color];
            return (
              <button
                key={section}
                onClick={() => onNavigate(section)}
                className={`flex flex-col items-center gap-2.5 py-4 px-3 rounded-xl border-2 transition-all hover:shadow-sm ${c.border} ${c.bg} ${c.hover}`}
              >
                <Icon className={`w-5 h-5 ${c.icon}`} />
                <span className="text-xs font-semibold text-slate-700">{label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("dashboard");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isLoggedIn()) {
      router.replace("/admin/login");
    }
  }, [router]);

  if (!mounted) return null;

  function renderSection() {
    if (activeSection === "dashboard") return <DashboardOverview onNavigate={setActiveSection} />;
    if (activeSection === "fraud") return <FraudView />;
    if (activeSection === "pending-approvals") return <PendingApprovalsView />;
    if (SECTIONS[activeSection]) return <SectionView sectionId={activeSection} />;
    return <p className="text-slate-400">Section not found</p>;
  }

  const currentTitle =
    activeSection === "dashboard" ? "Dashboard Overview"
    : SECTIONS[activeSection]?.title ?? activeSection;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar active={activeSection} onNavigate={setActiveSection} />

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200 px-6 py-3.5 flex items-center justify-between shadow-sm">
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <span>Admin</span>
              {activeSection !== "dashboard" && (
                <>
                  <ChevronRight className="w-3 h-3" />
                  <span className="text-slate-600 font-medium">{currentTitle}</span>
                </>
              )}
            </div>
            <h1 className="text-sm font-bold text-slate-900">{currentTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-400">Logged in as</p>
              <p className="text-xs font-semibold text-slate-700">Super Admin</p>
            </div>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-sm font-bold shadow">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{renderSection()}</div>
      </main>
    </div>
  );
}
