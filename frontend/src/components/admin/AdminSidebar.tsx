"use client";

import { useRouter } from "next/navigation";
import { clearToken } from "@/lib/admin/api";
import {
  LayoutDashboard,
  Users,
  Building2,
  Briefcase,
  FolderOpen,
  Home,
  FileText,
  ArrowLeftRight,
  Bell,
  AlertTriangle,
  LogOut,
  ShieldCheck,
} from "lucide-react";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "Users", icon: Users },
  { id: "listings", label: "Listings", icon: Home },
  { id: "agencies", label: "Agencies", icon: Building2 },
  { id: "brokers", label: "Brokers", icon: Briefcase },
  { id: "projects", label: "Projects", icon: FolderOpen },
  { id: "shared-housing", label: "Shared Housing", icon: Home },
  { id: "blog", label: "Blog Posts", icon: FileText },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "fraud", label: "Fraud Queue", icon: AlertTriangle },
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
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <ShieldCheck className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="font-bold text-white text-sm">AXIOM</span>
          <span className="ml-2 text-xs bg-blue-600 text-white px-1.5 py-0.5 rounded font-medium">
            Admin
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              } ${id === "fraud" ? "mt-2 border-t border-slate-800 pt-4" : ""}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {id === "fraud" && (
                <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                  !
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-3 mb-3">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            A
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">Admin</p>
            <p className="text-slate-400 text-xs">Super Admin</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
