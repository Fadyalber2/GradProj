"use client";

import type { ElementType } from "react";
import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/admin/api";
import {
  LayoutDashboard,
  Users,
  Building2,
  FolderOpen,
  Home,
  FileText,
  ArrowLeftRight,
  Bell,
  AlertTriangle,
  Clock,
  LogOut,
  ShieldCheck,
  BedDouble,
} from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  icon: ElementType;
  alert?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ id: "dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "People",
    items: [
      { id: "users", label: "Users", icon: Users },
    ],
  },
  {
    label: "Properties",
    items: [
      { id: "listings", label: "Listings", icon: Home },
      { id: "pending-approvals", label: "Pending Approvals", icon: Clock, alert: true },
      { id: "projects", label: "Projects", icon: FolderOpen },
      { id: "shared-housing", label: "Shared Housing", icon: BedDouble },
    ],
  },
  {
    label: "Business",
    items: [
      { id: "agencies", label: "Agencies", icon: Building2 },
      { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
    ],
  },
  {
    label: "Content",
    items: [
      { id: "blog", label: "Blog Posts", icon: FileText },
      { id: "notifications", label: "Notifications", icon: Bell },
    ],
  },
  {
    label: "Moderation",
    items: [{ id: "fraud", label: "Fraud Queue", icon: AlertTriangle, alert: true }],
  },
];

interface Props {
  active: string;
  onNavigate: (section: string) => void;
}

export default function AdminSidebar({ active, onNavigate }: Props) {
  const router = useRouter();

  function handleLogout() {
    clearToken();
    router.replace("/admin/login");
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-slate-900 flex flex-col z-40">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-900/40">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div className="flex items-center gap-2">
          <span className="font-bold text-white text-sm tracking-wide">AXIOM</span>
          <span className="text-xs bg-blue-600/25 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded font-medium">
            Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(({ id, label: itemLabel, icon: Icon, alert }) => {
                const isActive = active === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left group ${
                      isActive
                        ? "bg-blue-600 text-white shadow-md shadow-blue-900/30"
                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 flex-shrink-0 transition-colors ${
                        isActive ? "text-white" : "text-slate-500 group-hover:text-slate-300"
                      }`}
                    />
                    <span className="flex-1">{itemLabel}</span>
                    {alert && (
                      <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 py-2 mb-1">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow">
            A
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">Admin</p>
            <p className="text-slate-500 text-xs">Super Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
