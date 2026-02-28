"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Search,
  LogIn,
  UserPlus,
  Menu,
  LayoutDashboard,
  MessageSquare,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/stores/authStore";

interface NavbarProps {
  variant?: "overlay" | "sticky";
}

export default function Navbar({ variant = "overlay" }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isSticky = variant === "sticky";

  const dashboardHref = "/dashboard";

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "?";

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <nav
      className={
        isSticky
          ? "sticky top-0 w-full z-50 border-b border-white/10 bg-black/40 backdrop-blur-md"
          : "absolute top-0 w-full z-50 border-b border-white/10 bg-black/20 backdrop-blur-sm"
      }
    >
      <div
        className={`mx-auto px-4 sm:px-6 lg:px-8 ${isSticky ? "max-w-[1600px]" : "max-w-7xl"}`}
      >
        <div
          className={`flex items-center justify-between ${isSticky ? "h-16" : "h-20"}`}
        >
          {/* Logo + nav links */}
          <div className="flex items-center gap-12">
            <Link
              href="/"
              className="text-2xl font-bold text-primary tracking-tighter"
            >
              AXIOM
            </Link>
            <div
              className={`hidden md:flex space-x-8 text-sm font-medium text-gray-300 ${isSticky ? "h-16 items-center" : ""}`}
            >
              {NAV_ITEMS.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={
                      isSticky
                        ? `h-full flex items-center pt-1 border-b-2 transition-colors ${
                            isActive
                              ? "text-white border-primary"
                              : "border-transparent hover:text-white hover:border-white/20"
                          }`
                        : `hover:text-white transition-colors ${isActive ? "text-white" : ""}`
                    }
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative hidden lg:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="h-4 w-4 text-gray-400" />
              </span>
              <Input
                type="text"
                placeholder="Search city, neighborhood..."
                className={`bg-white/10 border-none text-white text-sm rounded-full pl-10 pr-4 placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-primary w-64 ${isSticky ? "py-1.5" : "py-2 backdrop-blur-md"}`}
              />
            </div>

            {/* Auth: logged out */}
            {!user && (
              <div className="hidden sm:flex items-center gap-4 text-sm font-medium">
                <Link
                  href="/login"
                  className="text-white hover:text-primary flex items-center gap-1 transition-colors"
                >
                  <LogIn className="h-4 w-4" /> Log In
                </Link>
                <Link
                  href="/signup"
                  className="bg-primary hover:bg-primary-hover text-white px-5 py-2 rounded-full transition-colors flex items-center gap-1"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Sign Up
                </Link>
              </div>
            )}

            {/* Auth: logged in — avatar + premium dropdown */}
            {user && (
              <div className="hidden sm:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 group outline-none">
                      {/* Avatar */}
                      <div className="w-9 h-9 rounded-full border-2 border-primary/40 group-hover:border-primary transition-colors overflow-hidden flex-shrink-0 flex items-center justify-center bg-primary/20">
                        {user.avatar_url ? (
                          <Image
                            src={user.avatar_url}
                            alt={user.full_name ?? "User"}
                            width={36}
                            height={36}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          <span className="text-xs font-bold text-primary">
                            {initials}
                          </span>
                        )}
                      </div>
                      <span className="hidden lg:block text-sm font-medium text-white max-w-[100px] truncate">
                        {user.full_name ?? user.email}
                      </span>
                      <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-data-[state=open]:rotate-180 transition-transform hidden lg:block" />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    align="end"
                    sideOffset={10}
                    className="w-60 bg-card-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 p-1"
                  >
                    {/* Header */}
                    <DropdownMenuLabel className="px-3 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full border border-primary/30 overflow-hidden flex items-center justify-center bg-primary/20 flex-shrink-0">
                          {user.avatar_url ? (
                            <Image
                              src={user.avatar_url}
                              alt={user.full_name ?? "User"}
                              width={40}
                              height={40}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <span className="text-sm font-bold text-primary">
                              {initials}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">
                            {user.full_name ?? "User"}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="bg-white/5 mx-2" />

                    <DropdownMenuItem asChild>
                      <Link
                        href={dashboardHref}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <LayoutDashboard className="h-4 w-4 text-primary" />
                        Dashboard
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link
                        href="/messages"
                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-200 hover:text-white hover:bg-white/5 cursor-pointer transition-colors"
                      >
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Messages
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator className="bg-white/5 mx-2" />

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 cursor-pointer transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Log Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Mobile menu */}
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden text-white"
                >
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="bg-background-dark border-white/10 w-72"
              >
                <SheetTitle className="text-primary font-bold text-xl tracking-tighter">
                  AXIOM
                </SheetTitle>
                <nav className="flex flex-col gap-4 mt-6">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="text-gray-300 hover:text-white transition-colors text-sm font-medium py-2"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <hr className="border-white/10" />
                  {user ? (
                    <>
                      <Link
                        href={dashboardHref}
                        onClick={() => setOpen(false)}
                        className="text-white flex items-center gap-2 text-sm font-medium py-2"
                      >
                        <LayoutDashboard className="h-4 w-4" /> Dashboard
                      </Link>
                      <Link
                        href="/messages"
                        onClick={() => setOpen(false)}
                        className="text-white flex items-center gap-2 text-sm font-medium py-2"
                      >
                        <MessageSquare className="h-4 w-4" /> Messages
                      </Link>
                      <button
                        onClick={() => { setOpen(false); handleLogout(); }}
                        className="text-red-400 flex items-center gap-2 text-sm font-medium py-2 text-left"
                      >
                        <LogOut className="h-4 w-4" /> Log Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setOpen(false)}
                        className="text-white flex items-center gap-2 text-sm font-medium py-2"
                      >
                        <LogIn className="h-4 w-4" /> Log In
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setOpen(false)}
                        className="bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-full transition-colors text-sm font-medium text-center"
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
