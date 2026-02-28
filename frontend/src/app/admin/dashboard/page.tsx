"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getStats, listItems, deleteItem, updateItem, createItem, reviewFraud } from "@/lib/admin/api";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTable, { Column } from "@/components/admin/AdminTable";
import AdminModal from "@/components/admin/AdminModal";
import {
  Users, Home, Building2, Briefcase, FolderOpen,
  TrendingUp, AlertTriangle, Clock, CheckCircle,
  Search, Plus, RefreshCw, X
} from "lucide-react";

// ── Helpers ────────────────────────────────────────────────────────────────────

function Badge({ children, color }: { children: React.ReactNode; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    orange: "bg-orange-100 text-orange-700",
    gray: "bg-slate-100 text-slate-600",
    yellow: "bg-yellow-100 text-yellow-700",
    purple: "bg-purple-100 text-purple-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.gray}`}>
      {children}
    </span>
  );
}

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string; icon: React.ElementType; color: string; sub?: string;
}) {
  const colors: Record<string, { bg: string; icon: string; text: string }> = {
    blue: { bg: "bg-blue-50", icon: "text-blue-600", text: "text-blue-700" },
    green: { bg: "bg-green-50", icon: "text-green-600", text: "text-green-700" },
    purple: { bg: "bg-purple-50", icon: "text-purple-600", text: "text-purple-700" },
    orange: { bg: "bg-orange-50", icon: "text-orange-600", text: "text-orange-700" },
    red: { bg: "bg-red-50", icon: "text-red-600", text: "text-red-700" },
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-6 h-6 ${c.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
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

type FieldDef = { key: string; label: string; type?: string; options?: string[] };

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
      { key: "area", label: "Area (m²)", type: "number" },
      { key: "property_type", label: "Type", type: "select", options: ["apartment", "villa", "studio", "duplex", "penthouse", "chalet", "land", "commercial"] },
      { key: "category", label: "Category", type: "select", options: ["rent", "buy", "shared"] },
      { key: "status", label: "Status", type: "select", options: ["active", "pending", "draft", "sold", "rented"] },
      { key: "description", label: "Description", type: "textarea" },
    ],
    createFields: [
      { key: "title", label: "Title" },
      { key: "price", label: "Price (EGP)", type: "number" },
      { key: "location", label: "Location" },
      { key: "bedrooms", label: "Bedrooms", type: "number" },
      { key: "bathrooms", label: "Bathrooms", type: "number" },
      { key: "area", label: "Area (m²)", type: "number" },
      { key: "property_type", label: "Type", type: "select", options: ["apartment", "villa", "studio", "duplex", "penthouse", "chalet", "land", "commercial"] },
      { key: "category", label: "Category", type: "select", options: ["rent", "buy", "shared"] },
      { key: "broker_id", label: "Broker ID" },
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
      { key: "address", label: "Address" },
      {
        key: "is_verified", label: "Verified",
        render: (v) => <Badge color={v ? "green" : "gray"}>{v ? "Verified" : "Unverified"}</Badge>,
      },
      { key: "created_at", label: "Created", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
      { key: "website", label: "Website" },
      { key: "is_verified", label: "Verified", type: "select", options: ["true", "false"] },
    ],
    createFields: [
      { key: "name", label: "Name" },
      { key: "slug", label: "Slug (URL-safe)" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "phone", label: "Phone" },
      { key: "email", label: "Email" },
      { key: "address", label: "Address" },
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
      { key: "name", label: "Project Name" },
      { key: "location", label: "Location" },
      { key: "min_price", label: "Min Price", render: (v) => formatPrice(v) },
      { key: "max_price", label: "Max Price", render: (v) => formatPrice(v) },
      {
        key: "status", label: "Status",
        render: (v) => <Badge color={v === "ready" ? "green" : v === "under_construction" ? "yellow" : "gray"}>{String(v ?? "")}</Badge>,
      },
      { key: "total_units", label: "Units" },
      { key: "created_at", label: "Created", render: (v) => formatDate(v) },
    ],
    editFields: [
      { key: "name", label: "Name" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "location", label: "Location" },
      { key: "min_price", label: "Min Price (EGP)", type: "number" },
      { key: "max_price", label: "Max Price (EGP)", type: "number" },
      { key: "total_units", label: "Total Units", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["under_construction", "ready", "selling", "sold_out"] },
      { key: "delivery_date", label: "Delivery Date" },
    ],
    createFields: [
      { key: "name", label: "Name" },
      { key: "location", label: "Location" },
      { key: "agency_id", label: "Agency ID" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "min_price", label: "Min Price (EGP)", type: "number" },
      { key: "max_price", label: "Max Price (EGP)", type: "number" },
      { key: "total_units", label: "Total Units", type: "number" },
      { key: "status", label: "Status", type: "select", options: ["under_construction", "ready", "selling", "sold_out"] },
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
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "content", label: "Content", type: "textarea" },
      { key: "category", label: "Category" },
      { key: "is_published", label: "Published", type: "select", options: ["true", "false"] },
    ],
    createFields: [
      { key: "title", label: "Title" },
      { key: "summary", label: "Summary", type: "textarea" },
      { key: "content", label: "Content", type: "textarea" },
      { key: "category", label: "Category" },
      { key: "author_id", label: "Author ID" },
      { key: "is_published", label: "Published", type: "select", options: ["true", "false"] },
    ],
  },
  transactions: {
    title: "Transactions",
    apiSection: "transactions",
    searchPlaceholder: "Search…",
    readOnly: true,
    columns: [
      { key: "id", label: "ID", render: (v) => <span className="font-mono text-xs">{String(v ?? "").slice(0, 8)}…</span> },
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

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Coerce boolean-looking selects
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(form)) {
      if (v === "true") clean[k] = true;
      else if (v === "false") clean[k] = false;
      else clean[k] = v;
    }
    onSave(clean);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {fields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            {field.label}
          </label>
          {field.type === "textarea" ? (
            <textarea
              value={String(form[field.key] ?? "")}
              onChange={(e) => set(field.key, e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          ) : field.type === "select" ? (
            <select
              value={String(form[field.key] ?? "")}
              onChange={(e) => set(field.key, e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition"
        >
          {loading ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
        >
          Cancel
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-xl font-bold text-slate-900">{config.title}</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={config.searchPlaceholder}
              className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
          {/* Extra filters */}
          {config.extraFilters?.map((f) => (
            <select
              key={f.key}
              value={filters[f.key] ?? ""}
              onChange={(e) => { setFilters((prev) => ({ ...prev, [f.key]: e.target.value })); setPage(1); }}
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All {f.label}s</option>
              {f.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          ))}
          {/* Refresh */}
          <button
            onClick={load}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Add button */}
          {config.canCreate && (
            <button
              onClick={() => setCreating(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
            >
              <Plus className="w-4 h-4" />
              Add {config.title.replace(/s$/, "")}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError("")}><X className="w-4 h-4" /></button>
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
        title={`Edit ${config.title.replace(/s$/, "")}`}
        open={!!editRow}
        onClose={() => setEditRow(null)}
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
        title={`Add New ${config.title.replace(/s$/, "")}`}
        open={creating}
        onClose={() => setCreating(false)}
      >
        <EntityForm
          fields={config.createFields ?? config.editFields}
          onSave={handleSave}
          onCancel={() => setCreating(false)}
          loading={modalLoading}
        />
      </AdminModal>

      {/* Delete Confirm */}
      <AdminModal
        title="Confirm Delete"
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
      >
        <p className="text-slate-600 mb-6">
          Are you sure you want to delete{" "}
          <strong>{String(deleteTarget?.title ?? deleteTarget?.name ?? deleteTarget?.full_name ?? "this record")}</strong>?
          This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleDelete}
            disabled={modalLoading}
            className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition"
          >
            {modalLoading ? "Deleting…" : "Delete"}
          </button>
          <button
            onClick={() => setDeleteTarget(null)}
            className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-sm transition"
          >
            Cancel
          </button>
        </div>
      </AdminModal>

      {/* View Modal */}
      <AdminModal
        title="Record Details"
        open={!!viewRow}
        onClose={() => setViewRow(null)}
        width="max-w-2xl"
      >
        {viewRow && (
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(viewRow).map(([k, v]) => (
              <div key={k} className="col-span-1">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">{k.replace(/_/g, " ")}</p>
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
        return (
          <span className={`font-bold ${score > 0.7 ? "text-red-600" : score > 0.4 ? "text-orange-500" : "text-green-600"}`}>
            {(score * 100).toFixed(0)}%
          </span>
        );
      },
    },
    { key: "created_at", label: "Created", render: (v) => formatDate(v) },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900">Fraud Queue</h2>
        <Badge color="red">{total} flagged listings</Badge>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col) => (
                  <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-600">{col.label}</th>
                ))}
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{columns.map((c) => (
                    <td key={c.key} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}<td className="px-4 py-3"><div className="h-4 bg-slate-100 rounded animate-pulse w-24 ml-auto" /></td></tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400">No flagged listings</td></tr>
              ) : (
                data.map((row) => (
                  <tr key={String(row.id)} className="hover:bg-slate-50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-slate-700">
                        {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleAction(String(row.id), "approve")}
                          disabled={actioning === String(row.id)}
                          className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-60 transition"
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
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <span className="text-sm text-slate-500">{total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition">‹</button>
              <span className="text-sm text-slate-600">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages} className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition">›</button>
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
    { label: "Total Agencies", key: "total_agencies", icon: Building2, color: "purple", section: "agencies" },
    { label: "Total Projects", key: "total_projects", icon: FolderOpen, color: "orange", section: "projects" },
    { label: "Total Brokers", key: "total_users", icon: Briefcase, color: "blue", section: "brokers", sub: "Role = broker" },
    { label: "Pending Listings", key: "pending_listings", icon: Clock, color: "orange", section: "listings" },
    { label: "Flagged Fraud", key: "flagged_listings", icon: AlertTriangle, color: "red", section: "fraud" },
    { label: "Active Shared Housing", key: "total_shared_housing", icon: CheckCircle, color: "green", section: "shared-housing" },
    { label: "Blog Posts", key: "total_blog_posts", icon: TrendingUp, color: "purple", section: "blog" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Dashboard Overview</h2>
        <p className="text-sm text-slate-500">Welcome back, Admin. Here&apos;s the platform snapshot.</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {statCards.map(({ label, key, icon, color, section, sub }) => (
          <button
            key={label}
            onClick={() => onNavigate(section)}
            className="text-left hover:ring-2 hover:ring-blue-200 rounded-xl transition group"
          >
            <StatCard
              label={label}
              value={loading ? "…" : (stats?.[key as keyof typeof stats] ?? 0)}
              icon={icon}
              color={color}
              sub={sub}
            />
          </button>
        ))}
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Manage Users", section: "users", icon: Users, color: "blue" },
            { label: "Review Listings", section: "listings", icon: Home, color: "green" },
            { label: "Manage Agencies", section: "agencies", icon: Building2, color: "purple" },
            { label: "Fraud Queue", section: "fraud", icon: AlertTriangle, color: "red" },
          ].map(({ label, section, icon: Icon, color }) => (
            <button
              key={section}
              onClick={() => onNavigate(section)}
              className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition hover:shadow-md
                ${color === "blue" ? "border-blue-100 bg-blue-50 hover:border-blue-300" :
                  color === "green" ? "border-green-100 bg-green-50 hover:border-green-300" :
                  color === "purple" ? "border-purple-100 bg-purple-50 hover:border-purple-300" :
                  "border-red-100 bg-red-50 hover:border-red-300"}`}
            >
              <Icon className={`w-6 h-6 ${color === "blue" ? "text-blue-600" : color === "green" ? "text-green-600" : color === "purple" ? "text-purple-600" : "text-red-600"}`} />
              <span className="text-sm font-medium text-slate-700">{label}</span>
            </button>
          ))}
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    if (!isLoggedIn()) {
      router.replace("/admin/login");
    }
  }, [router]);

  if (!mounted) return null;

  function renderSection() {
    if (activeSection === "dashboard") return <DashboardOverview onNavigate={setActiveSection} />;
    if (activeSection === "fraud") return <FraudView />;
    if (SECTIONS[activeSection]) return <SectionView sectionId={activeSection} />;
    return <p className="text-slate-400">Section not found</p>;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar active={activeSection} onNavigate={setActiveSection} />

      {/* Main content */}
      <main className="flex-1 ml-64 min-h-screen">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-base font-semibold text-slate-900">
              {activeSection === "dashboard" ? "Dashboard Overview" :
               SECTIONS[activeSection]?.title ?? activeSection}
            </h1>
            <p className="text-xs text-slate-400">AXIOM Admin Panel</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Logged in as <strong>Admin</strong></span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">A</div>
          </div>
        </header>

        {/* Page content */}
        <div className="p-6">{renderSection()}</div>
      </main>
    </div>
  );
}
