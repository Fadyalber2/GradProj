"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  Loader2,
  PenLine,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { updateProfileMutation, type UpdateProfileInput } from "@/lib/queries";
import { formatDate } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import type { ApiProfileResponse } from "@/types/api";

interface ProfileSettingsProps {
  profile: ApiProfileResponse;
  listingsCount: number;
  likedCount: number;
  pendingApplications: number;
}

type ProfileFormState = {
  full_name: string;
  phone: string;
  country_code: string;
  birth_date: string;
  avatar_url: string;
  bio: string;
};

function buildForm(profile: ApiProfileResponse): ProfileFormState {
  return {
    full_name: profile.full_name ?? "",
    phone: profile.phone ?? profile.whatsapp_number ?? "",
    country_code: profile.country_code ?? "+20",
    birth_date: profile.birth_date?.slice(0, 10) ?? "",
    avatar_url: profile.avatar_url ?? "",
    bio: profile.bio ?? "",
  };
}

function emptyToNull(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function calculateAge(birthDate: string | null | undefined): number | null {
  if (!birthDate) return null;
  const born = new Date(`${birthDate.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate());
  if (!hadBirthday) age -= 1;
  return age;
}

function capitalize(s: string | null | undefined) {
  if (!s) return null;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function ProfileSettings({
  profile,
  listingsCount,
  likedCount,
  pendingApplications,
}: ProfileSettingsProps) {
  const queryClient = useQueryClient();
  const refreshProfile = useAuthStore((state) => state.refreshProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<ProfileFormState>(() => buildForm(profile));
  const [error, setError] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!isEditing) setForm(buildForm(profile));
  }, [isEditing, profile]);

  const initials = useMemo(() => {
    const name = profile.full_name || profile.email;
    return name
      .split(/\s|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
  }, [profile.email, profile.full_name]);

  const mutation = useMutation({
    ...updateProfileMutation,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard", "me"] }),
        refreshProfile(),
      ]);
      setIsEditing(false);
      setError("");
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Could not save profile.");
    },
  });

  function setField<K extends keyof ProfileFormState>(
    key: K,
    value: ProfileFormState[K],
  ) {
    setForm((cur) => ({ ...cur, [key]: value }));
  }

  async function handleAvatarUpload(file: File) {
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Avatar must be an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("Avatar must be smaller than 4 MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const { upload_url, public_url } = await api.post<{
        upload_url: string;
        public_url: string;
      }>("/api/uploads/signed-url", { bucket: "avatars", filename: file.name });
      const res = await fetch(upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!res.ok) throw new Error("Upload failed.");
      setField("avatar_url", public_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Avatar upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fullName = form.full_name.trim();
    const age = calculateAge(form.birth_date);

    if (!fullName) {
      setError("Full name is required.");
      return;
    }
    if (age !== null && (age < 16 || age > 100)) {
      setError("Birth date must give an age between 16 and 100.");
      return;
    }

    const contact = emptyToNull(form.phone);
    const payload: UpdateProfileInput = {
      full_name: fullName,
      phone: contact,
      whatsapp_number: contact,
      country_code: emptyToNull(form.country_code),
      birth_date: emptyToNull(form.birth_date),
      avatar_url: emptyToNull(form.avatar_url),
      bio: emptyToNull(form.bio),
    };

    mutation.mutate(payload);
  }

  const displayAge = calculateAge(profile.birth_date) ?? profile.age;
  const contact = profile.phone || profile.whatsapp_number;

  const infoRows: [string, string][] = [
    ["Contact", contact || "Not set"],
    ["Gender", capitalize(profile.gender) ?? "Not set"],
    [
      "Birth date",
      profile.birth_date ? formatDate(`${profile.birth_date.slice(0, 10)}T00:00:00`) : "Not set",
    ],
    ["Age", displayAge ? `${displayAge} yrs` : "Not set"],
    [
      "Last updated",
      profile.updated_at ? formatDate(profile.updated_at) : "—",
    ],
  ];

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/80 ">
      <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
        {/* ── Left: avatar + bio + stats + quick info ── */}
        <div className="border-b border-white/10 bg-card-dark p-5 sm:p-6 lg:border-b-0 lg:border-r">
          {/* Avatar + name */}
          <div className="flex items-start gap-4">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-xl border border-white/15 bg-white/5">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.full_name || profile.email}
                  fill
                  sizes="64px"
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex h-full items-center justify-center text-lg font-semibold text-primary/80">
                  {initials || <UserRound className="size-6" />}
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-white">
                  {profile.full_name || "Unnamed user"}
                </h2>
                {profile.is_verified_seller && (
                  <span className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <BadgeCheck className="size-3" />
                    Verified
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-sm text-zinc-400">
                {profile.email}
              </p>
              <p className="mt-2 text-sm leading-5 text-zinc-300 line-clamp-2">
                {profile.bio || "No bio added yet."}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-3 divide-x divide-white/10 rounded-xl border border-white/10 bg-black/20">
            {(
              [
                ["Listings", listingsCount],
                ["Saved", likedCount],
                ["Pending", pendingApplications],
              ] as [string, number][]
            ).map(([label, value]) => (
              <div key={label} className="py-3 text-center">
                <p className="font-mono text-xl font-bold text-white">
                  {value}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
              </div>
            ))}
          </div>

          {/* Quick info */}
          <dl className="mt-4 space-y-0">
            {(
              [
                ["Contact", contact || "Not set"],
                ["Gender", capitalize(profile.gender) ?? "Not set"],
                ["Age", displayAge ? `${displayAge} yrs` : "Not set"],
                [
                  "Since",
                  profile.created_at ? formatDate(profile.created_at) : "—",
                ],
              ] as [string, string][]
            ).map(([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between border-t border-white/10 py-2 text-sm"
              >
                <dt className="text-zinc-500">{label}</dt>
                <dd className="text-right text-zinc-200">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* ── Right: settings ── */}
        <div className="p-5 bg-card-dark sm:p-6">
          <div className="mb-5 flex flex-wrap  items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-widest text-primary">
                Profile settings
              </p>
              <h3 className="mt-0.5 text-lg font-semibold tracking-tight text-white">
                Keep account details current
              </h3>
            </div>
            <Button
              type="button"
              variant={isEditing ? "secondary" : "default"}
              size="sm"
              onClick={() => {
                setError("");
                setIsEditing((v) => !v);
              }}
              className="rounded-xl active:scale-[0.98]"
            >
              {isEditing ? (
                <Check className="size-4" />
              ) : (
                <PenLine className="size-4" />
              )}
              {isEditing ? "Reviewing" : "Edit info"}
            </Button>
          </div>

          {isEditing ? (
            <form onSubmit={handleSubmit} className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium text-zinc-300">
                  Full name
                  <Input
                    value={form.full_name}
                    onChange={(e) => setField("full_name", e.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-300">
                  Phone / WhatsApp
                  <Input
                    value={form.phone}
                    onChange={(e) => setField("phone", e.target.value)}
                    placeholder="+201001234567"
                    className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-300">
                  Country code
                  <Input
                    value={form.country_code}
                    onChange={(e) => setField("country_code", e.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-300">
                  Birth date
                  <Input
                    type="date"
                    value={form.birth_date}
                    onChange={(e) => setField("birth_date", e.target.value)}
                    className="h-10 rounded-xl border-white/10 bg-white/5 text-white"
                  />
                </label>
              </div>

              {/* Avatar */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Avatar photo
                    </p>
                    <p className="text-xs text-zinc-500">
                      Square image · max 4 MB
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:bg-white/10 active:scale-[0.98]">
                    {avatarUploading ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Upload className="size-3.5" />
                    )}
                    {avatarUploading ? "Uploading…" : "Upload"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={avatarUploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleAvatarUpload(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
                {form.avatar_url && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-950/60 p-2">
                    <div className="relative size-8 shrink-0 overflow-hidden rounded-lg bg-white/5">
                      <Image
                        src={form.avatar_url}
                        alt="Preview"
                        fill
                        sizes="32px"
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                    <p className="min-w-0 flex-1 truncate text-xs text-zinc-500">
                      {form.avatar_url}
                    </p>
                  </div>
                )}
              </div>

              <label className="grid gap-1.5 text-sm font-medium text-zinc-300">
                Bio
                <Textarea
                  value={form.bio}
                  onChange={(e) => setField("bio", e.target.value)}
                  className="min-h-20 rounded-xl border-white/10 bg-white/5 text-white"
                />
              </label>

              {error && (
                <p className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
                  {error}
                </p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setForm(buildForm(profile));
                    setIsEditing(false);
                    setError("");
                  }}
                  className="rounded-xl text-zinc-300 active:scale-[0.98]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={mutation.isPending}
                  className="rounded-xl bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
                >
                  {mutation.isPending && (
                    <Loader2 className="size-4 animate-spin" />
                  )}
                  Save and sync
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid gap-2 text-sm">
              {infoRows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5"
                >
                  <span className="text-zinc-500">{label}</span>
                  <span className="text-right text-zinc-200">{value}</span>
                </div>
              ))}
              <div className="mt-1 grid gap-2 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <CalendarDays className="size-4 text-primary" />
                    Member since
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {profile.created_at ? formatDate(profile.created_at) : "—"}
                  </p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
                  <div className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                    <ShieldCheck className="size-4 text-primary" />
                    Account security
                  </div>
                  <a
                    href="/forgot-password"
                    className="mt-1 inline-flex text-sm text-primary underline-offset-4 transition-transform hover:translate-x-0.5 hover:underline"
                  >
                    Change password
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
