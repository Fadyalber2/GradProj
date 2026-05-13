# Shared Housing Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Lifestyle Preferences UI, Roommate Application System, and dedicated `/shared-housing` search page for AXIOM V2.

**Architecture:** Backend-first per feature group — add types and API layer before UI. Each task ends with a TypeScript check (`npx tsc --noEmit` in `frontend/`) or a backend smoke test. The property detail page (`/property/[id]`) is a server component — the Apply button ships as a separate `"use client"` component rendered inside it.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui (`Tabs`, `Dialog`, `Switch`, `Select`, `Textarea`), TanStack Query v5, Zustand, FastAPI, Supabase, Ollama

**Spec:** `docs/superpowers/specs/2026-05-12-shared-housing-features-design.md`

---

## Task 1: TypeScript API types

**Files:**
- Modify: `frontend/src/types/api.ts`

- [ ] **Step 1: Add application types and update DashboardResponse**

Open `frontend/src/types/api.ts`. Add after the `ApiNotification` interface at the bottom:

```typescript
// ── Applications (shared housing) ──

export interface ApplicationBrief {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  applicant_id: string;
  applicant_name: string | null;
  applicant_avatar: string | null;
  status: "pending" | "approved" | "rejected";
  message: string;
  lifestyle_data: ListingLifestylePreferences | null;
  compatibility_score: number | null;
  created_at: string;
}

export interface MyApplicationBrief {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_image: string | null;
  listing_location: string;
  status: "pending" | "approved" | "rejected";
  compatibility_score: number | null;
  created_at: string;
}
```

Also find the `DashboardResponse` interface and add one field:

```typescript
export interface DashboardResponse {
  // ... existing fields ...
  pending_applications: number;   // ← add this line
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/api.ts
git commit -m "feat(types): add ApplicationBrief, MyApplicationBrief, pending_applications"
```

---

## Task 2: Frontend query/mutation layer

**Files:**
- Modify: `frontend/src/lib/queries.ts`

- [ ] **Step 1: Add imports**

At the top of `frontend/src/lib/queries.ts`, extend the import from `@/types/api`:

```typescript
import type {
  PaginatedListings,
  ListingDetailWithSimilar,
  ListingBrief,
  PaginatedAgencies,
  ApiAgencyDetail,
  ProjectBrief,
  ApiProjectDetail,
  PaginatedBlogPosts,
  BlogPostDetail,
  BlogPostBrief,
  DashboardResponse,
  ApiNotification,
  ApplicationBrief,
  MyApplicationBrief,
  ListingLifestylePreferences,
} from "@/types/api";
```

- [ ] **Step 2: Add SharedHousingParams and queries**

After the existing `listingsQueries` block, add:

```typescript
export interface SharedHousingParams {
  gender_preference?: "male" | "female";
  utilities_included?: boolean;
  room_type?: "private" | "ensuite" | "shared";
  has_spots?: boolean;
  available_before?: string;
  min_price?: number;
  max_price?: number;
  page?: number;
  per_page?: number;
}

export const sharedHousingQueries = {
  list: (params?: SharedHousingParams) => ({
    queryKey: ["shared-housing", params],
    queryFn: () =>
      api.get<PaginatedListings>("/api/listings", {
        params: {
          category: "shared_housing",
          ...params,
        } as Record<string, string | number | boolean | undefined>,
      }),
  }),

  recommendations: () => ({
    queryKey: ["recommendations", "shared-housing"],
    queryFn: () =>
      api.get<ListingBrief[]>("/api/ai/recommendations", {
        params: { category: "shared_housing" },
      }),
  }),
};
```

- [ ] **Step 3: Add application queries and mutations**

After `sharedHousingQueries`, add:

```typescript
export const applicationsQueries = {
  received: (listingId: string) => ({
    queryKey: ["applications", "received", listingId],
    queryFn: () =>
      api.get<ApplicationBrief[]>(`/api/listings/${listingId}/applications`),
  }),

  my: () => ({
    queryKey: ["applications", "my"],
    queryFn: () => api.get<MyApplicationBrief[]>("/api/applications/my"),
  }),
};

export const applyMutation = {
  mutationFn: (data: {
    listing_id: string;
    message: string;
    lifestyle_data: ListingLifestylePreferences;
  }) => api.post<{ id: string; status: string }>("/api/applications", data),
};

export const updateApplicationMutation = {
  mutationFn: ({
    id,
    status,
  }: {
    id: string;
    status: "approved" | "rejected";
  }) =>
    api.put<{ id: string; status: string }>(`/api/applications/${id}`, {
      status,
    }),
};
```

- [ ] **Step 4: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/queries.ts
git commit -m "feat(queries): add shared housing, applications queries and mutations"
```

---

## Task 3: Backend — shared-housing filter params on listings

**Files:**
- Modify: `backend/app/listings/router.py`

- [ ] **Step 1: Add new query params to `list_listings`**

In `backend/app/listings/router.py`, find the `list_listings` function. It starts around:

```python
@router.get("", response_model=ListingsPageResponse)
async def list_listings(
    category: str | None = Query(None),
    city: str | None = Query(None),
    ...
```

Add these new params to the function signature (after `bedrooms`):

```python
    # Shared-housing only filters
    gender_preference: str | None = Query(None),
    utilities_included: bool | None = Query(None),
    room_type: str | None = Query(None),
    has_spots: bool | None = Query(None),
    available_before: str | None = Query(None),
```

- [ ] **Step 2: Apply filters in the query body**

Find where `bedrooms` filter is applied (after other filters). After that block, add:

```python
    # Shared-housing specific filters — only apply when category == shared_housing
    if category == "shared_housing":
        if gender_preference:
            query = query.eq(
                "lifestyle_preferences->>gender_preference", gender_preference
            )
        if utilities_included is not None:
            query = query.eq("utilities_included", utilities_included)
        if room_type:
            query = query.eq("room_type", room_type)
        if has_spots:
            # filled_spots < total_spots — Supabase doesn't support column comparison directly,
            # use RPC or filter client-side. For now, filter listings with filled_spots < total_spots.
            # This is handled via a PostgREST filter: filled_spots.lt.total_spots is not directly
            # supported. Apply a filter that total_spots > 0 to ensure spots exist.
            query = query.gt("total_spots", 0)
        if available_before:
            query = query.lte("available_date", available_before)
```

> Note: `has_spots` filtering via `filled_spots < total_spots` is not directly expressible in PostgREST column comparisons. The `gt("total_spots", 0)` ensures the listing has spots defined. A proper implementation would require an RPC or computed column — mark this as a known limitation for now.

- [ ] **Step 3: Smoke test**

Start backend (`cd backend && uvicorn app.main:app --reload`). Test:

```bash
curl "http://localhost:8000/api/listings?category=shared_housing&utilities_included=true"
```

Expected: 200 response with `listings` array.

- [ ] **Step 4: Commit**

```bash
git add backend/app/listings/router.py
git commit -m "feat(backend): add shared-housing filter params to GET /api/listings"
```

---

## Task 4: Backend — applications router (lifestyle_data + compat score + GET /my)

**Files:**
- Modify: `backend/app/applications/router.py`

- [ ] **Step 1: Add lifestyle_data to CreateApplicationRequest and save it**

In `backend/app/applications/router.py`, update `CreateApplicationRequest`:

```python
class CreateApplicationRequest(BaseModel):
    listing_id: str
    message: str = ""
    lifestyle_data: dict = {}
```

Find the `application_data` dict and add `lifestyle_data`:

```python
    application_data = {
        "listing_id": body.listing_id,
        "applicant_id": user_id,
        "message": body.message,
        "lifestyle_data": body.lifestyle_data,
        "status": "pending",
    }
```

- [ ] **Step 2: Add background compat score computation**

At the top of the file, add imports:

```python
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
```

Update `create_application` signature to accept background tasks:

```python
@router.post("", status_code=201)
async def create_application(
    body: CreateApplicationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
```

Add the background task function before `create_application`:

```python
async def _compute_and_store_score(
    application_id: str,
    listing_id: str,
    lifestyle_data: dict,
    housemates_data: list,
) -> None:
    """Compute AI compatibility score and store it on the application."""
    try:
        from app.ai.ollama_client import ollama

        if not await ollama.health():
            return

        if not housemates_data:
            return

        housemate_lines = []
        for h in housemates_data[:10]:
            prefs = h.get("lifestyle_preferences") or {}
            tags = h.get("tags") or []
            line = (
                f"- {h.get('name', 'Housemate')} | "
                f"age {h.get('age', '?')} | "
                f"{h.get('occupation', 'unknown')} | "
                f"tags: {', '.join(tags)} | "
                f"lifestyle: {prefs}"
            )
            housemate_lines.append(line)

        user_block = f"Applicant lifestyle preferences: {lifestyle_data}"
        housemates_block = "Existing housemates:\n" + "\n".join(housemate_lines)

        prompt = (
            f"{user_block}\n\n{housemates_block}\n\n"
            "Score compatibility 0-100. "
            'Return JSON only: {"score": <int>, "reasons": [<str>]}'
        )
        system = (
            "You are a roommate compatibility scorer. "
            "Consider gender_preference, smoking_allowed, pets_allowed, "
            "guests_policy, noise_level, cleanliness, sleep_schedule, occupation_type. "
            "Return ONLY valid JSON with keys 'score' (int 0-100) and 'reasons' (list of strings)."
        )

        raw = await ollama.generate(prompt, system)
        import json, re

        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            return
        parsed = json.loads(match.group())
        score = max(0, min(100, int(parsed.get("score", 50))))

        supabase_admin.table("listing_applications").update(
            {"compatibility_score": score}
        ).eq("id", application_id).execute()
    except Exception:
        pass
```

After inserting the application, before the notification block, add:

```python
    # Fetch housemates for background scoring
    try:
        housemates_result = (
            supabase_admin.table("housemates")
            .select("name, age, occupation, tags, lifestyle_preferences")
            .eq("listing_id", body.listing_id)
            .limit(10)
            .execute()
        )
        housemates_data = housemates_result.data or []
    except Exception:
        housemates_data = []

    background_tasks.add_task(
        _compute_and_store_score,
        result.data["id"],
        body.listing_id,
        body.lifestyle_data,
        housemates_data,
    )
```

- [ ] **Step 3: Add GET /api/applications/my endpoint**

At the end of the file, add:

```python
@router.get("/my")
async def get_my_applications(
    current_user: dict = Depends(get_current_user),
):
    """Return all applications submitted by the current user."""
    user_id = current_user["id"]

    try:
        result = (
            supabase_admin.table("listing_applications")
            .select(
                "id, listing_id, status, compatibility_score, created_at, "
                "listings(title, images, location)"
            )
            .eq("applicant_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    rows = result.data or []
    return [
        {
            "id": r["id"],
            "listing_id": r["listing_id"],
            "listing_title": (r.get("listings") or {}).get("title", ""),
            "listing_image": ((r.get("listings") or {}).get("images") or [None])[0],
            "listing_location": (r.get("listings") or {}).get("location", ""),
            "status": r["status"],
            "compatibility_score": r.get("compatibility_score"),
            "created_at": r["created_at"],
        }
        for r in rows
    ]
```

- [ ] **Step 4: Smoke test**

With backend running:

```bash
# Apply to a shared housing listing (replace TOKEN and LISTING_ID)
curl -X POST http://localhost:8000/api/applications \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"listing_id": "LISTING_ID", "message": "Hi!", "lifestyle_data": {"noise_level": "quiet"}}'
# Expected: 201 with application object

# Get own applications
curl http://localhost:8000/api/applications/my \
  -H "Authorization: Bearer TOKEN"
# Expected: 200 with array
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/applications/router.py
git commit -m "feat(backend): lifestyle_data snapshot, compat scoring, GET /applications/my"
```

---

## Task 5: Backend — dashboard pending_applications count

**Files:**
- Modify: `backend/app/dashboard/router.py`

- [ ] **Step 1: Add pending_applications to dashboard response**

In `backend/app/dashboard/router.py`, find where the dashboard response dict is built (the `return` statement or response construction). Add a query to count pending applications for the user's shared-housing listings:

```python
    # Count pending applications on user's shared-housing listings
    try:
        pending_apps_result = (
            supabase_admin.table("listing_applications")
            .select("id", count="exact")
            .eq("status", "pending")
            .in_(
                "listing_id",
                [l["id"] for l in (listings_result.data or []) if l.get("category") == "shared_housing"],
            )
            .execute()
        )
        pending_applications = pending_apps_result.count or 0
    except Exception:
        pending_applications = 0
```

Then add `"pending_applications": pending_applications` to the returned dict.

> **Note:** `listings_result` is whatever variable holds the user's listings query result. Inspect the existing dashboard router to find the correct variable name — adapt the variable name to match what's already there.

- [ ] **Step 2: Smoke test**

```bash
curl http://localhost:8000/api/dashboard/me \
  -H "Authorization: Bearer TOKEN"
# Expected: response contains "pending_applications": <int>
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/dashboard/router.py
git commit -m "feat(backend): add pending_applications count to dashboard response"
```

---

## Task 6: Backend — recommendations category filter

**Files:**
- Modify: `backend/app/ai/router.py`

- [ ] **Step 1: Add optional category param to GET /api/ai/recommendations**

In `backend/app/ai/router.py`, find the recommendations endpoint. It likely looks like:

```python
@router.get("/recommendations")
async def get_recommendations(
    explain: bool = Query(False),
    current_user: dict = Depends(get_current_user),
):
```

Add the `category` param:

```python
@router.get("/recommendations")
async def get_recommendations(
    explain: bool = Query(False),
    category: str | None = Query(None),
    current_user: dict = Depends(get_current_user),
):
```

Then find the favorites query and the fallback keyword query. In both, apply the category filter when `category` is set:

For favorites query (look for `.table("favorites")` fetch):
```python
    # When category is specified, only consider favorites in that category
    if category:
        # After fetching favorite listing IDs, filter to those with matching category
        fav_listings = [f for f in fav_listings if f.get("category") == category]
```

For the fallback structured query (look for `.table("listings").select(...)...order("views_count")`):
```python
    fallback_query = (
        supabase_admin.table("listings")
        .select("id, title, location, category, city, embedding")
        .eq("status", "active")
        .is_("deleted_at", "null")
    )
    if category:
        fallback_query = fallback_query.eq("category", category)
    # ... rest of query
```

> **Note:** The exact structure of the recommendations endpoint varies. Read through the existing code carefully and apply the filter in both the semantic path and the keyword fallback path.

- [ ] **Step 2: Smoke test**

```bash
curl "http://localhost:8000/api/ai/recommendations?category=shared_housing" \
  -H "Authorization: Bearer TOKEN"
# Expected: 200 with array of shared_housing listings
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/ai/router.py
git commit -m "feat(backend): add category filter to GET /api/ai/recommendations"
```

---

## Task 7: Feature A — LifestylePrefsForm component

**Files:**
- Create: `frontend/src/components/profile/LifestylePrefsForm.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/stores/authStore";
import { api } from "@/lib/api";
import type { ListingLifestylePreferences } from "@/types/api";

interface LifestylePrefsFormProps {
  initialPrefs?: ListingLifestylePreferences | null;
  onChange?: (prefs: ListingLifestylePreferences) => void;
  /** When true, shows save button and persists via PUT /api/auth/me */
  persistable?: boolean;
}

const COMPLETENESS_FIELDS: (keyof ListingLifestylePreferences)[] = [
  "gender_preference",
  "smoking_allowed",
  "pets_allowed",
  "guests_policy",
  "noise_level",
  "cleanliness",
  "sleep_schedule",
  "occupation_type",
];

export default function LifestylePrefsForm({
  initialPrefs,
  onChange,
  persistable = false,
}: LifestylePrefsFormProps) {
  const { user, setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const [prefs, setPrefs] = useState<ListingLifestylePreferences>(
    initialPrefs ?? {}
  );
  const [saved, setSaved] = useState(false);

  const completedCount = COMPLETENESS_FIELDS.filter(
    (f) => prefs[f] !== undefined && prefs[f] !== null
  ).length;
  const isComplete = completedCount === COMPLETENESS_FIELDS.length;

  const mutation = useMutation({
    mutationFn: (data: ListingLifestylePreferences) =>
      api.put("/api/auth/me", { lifestyle_preferences: data }),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  function update<K extends keyof ListingLifestylePreferences>(
    key: K,
    value: ListingLifestylePreferences[K]
  ) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    onChange?.(next);
  }

  return (
    <div className="space-y-5">
      {/* Completeness indicator */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${(completedCount / COMPLETENESS_FIELDS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 shrink-0">
          {completedCount}/{COMPLETENESS_FIELDS.length} filled
          {isComplete && (
            <CheckCircle2 className="inline ml-1 h-3.5 w-3.5 text-green-400" />
          )}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Gender preference */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium">Gender preference</label>
          <Select
            value={prefs.gender_preference ?? ""}
            onValueChange={(v) =>
              update("gender_preference", v as ListingLifestylePreferences["gender_preference"])
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male only</SelectItem>
              <SelectItem value="female">Female only</SelectItem>
              <SelectItem value="mixed">Mixed / Any</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Guests policy */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium">Guests policy</label>
          <Select
            value={prefs.guests_policy ?? ""}
            onValueChange={(v) =>
              update("guests_policy", v as ListingLifestylePreferences["guests_policy"])
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="flexible">Flexible</SelectItem>
              <SelectItem value="rarely">Rarely</SelectItem>
              <SelectItem value="never">Never</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Noise level */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium">Noise level</label>
          <Select
            value={prefs.noise_level ?? ""}
            onValueChange={(v) =>
              update("noise_level", v as ListingLifestylePreferences["noise_level"])
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="quiet">Quiet</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="lively">Lively</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cleanliness */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium">Cleanliness</label>
          <Select
            value={prefs.cleanliness ?? ""}
            onValueChange={(v) =>
              update("cleanliness", v as ListingLifestylePreferences["cleanliness"])
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="very_clean">Very clean</SelectItem>
              <SelectItem value="average">Average</SelectItem>
              <SelectItem value="relaxed">Relaxed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Sleep schedule */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium">Sleep schedule</label>
          <Select
            value={prefs.sleep_schedule ?? ""}
            onValueChange={(v) =>
              update("sleep_schedule", v as ListingLifestylePreferences["sleep_schedule"])
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="early_bird">Early bird</SelectItem>
              <SelectItem value="night_owl">Night owl</SelectItem>
              <SelectItem value="flexible">Flexible</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Occupation type */}
        <div className="space-y-1.5">
          <label className="text-xs text-gray-400 font-medium">Occupation</label>
          <Select
            value={prefs.occupation_type ?? ""}
            onValueChange={(v) =>
              update("occupation_type", v as ListingLifestylePreferences["occupation_type"])
            }
          >
            <SelectTrigger className="bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="any">Any</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toggle row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-gray-300">Smoking allowed</span>
          <Switch
            checked={prefs.smoking_allowed ?? false}
            onCheckedChange={(v) => update("smoking_allowed", v)}
          />
        </div>
        <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
          <span className="text-sm text-gray-300">Pets allowed</span>
          <Switch
            checked={prefs.pets_allowed ?? false}
            onCheckedChange={(v) => update("pets_allowed", v)}
          />
        </div>
      </div>

      {persistable && (
        <Button
          onClick={() => mutation.mutate(prefs)}
          disabled={mutation.isPending}
          className="w-full sm:w-auto"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : saved ? (
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-400" />
          ) : null}
          {saved ? "Saved!" : "Save Roommate Profile"}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/profile/LifestylePrefsForm.tsx
git commit -m "feat(profile): add LifestylePrefsForm component"
```

---

## Task 8: Feature A — Wire LifestylePrefsForm to dashboard

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Import and render LifestylePrefsForm**

In `frontend/src/app/dashboard/page.tsx`, add the imports:

```typescript
import LifestylePrefsForm from "@/components/profile/LifestylePrefsForm";
import type { ListingLifestylePreferences } from "@/types/api";
```

In the JSX return, add a new section after `<DashboardProfile user={profile} />`:

```tsx
{/* Roommate Profile section */}
<div className="mb-8 bg-card-dark rounded-2xl border border-white/10 p-6">
  <div className="flex items-center justify-between mb-4">
    <div>
      <h2 className="text-white font-bold text-lg">Roommate Profile</h2>
      <p className="text-gray-400 text-sm mt-0.5">
        Used to match you with compatible shared housing listings
      </p>
    </div>
  </div>
  <LifestylePrefsForm
    initialPrefs={user?.lifestyle_preferences as ListingLifestylePreferences | null}
    persistable
  />
</div>
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx
git commit -m "feat(dashboard): add Roommate Profile section with LifestylePrefsForm"
```

---

## Task 9: Feature B — ApplyModal component

**Files:**
- Create: `frontend/src/components/shared-housing/ApplyModal.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import LifestylePrefsForm from "@/components/profile/LifestylePrefsForm";
import { useAuthStore } from "@/stores/authStore";
import { applyMutation } from "@/lib/queries";
import type { ListingLifestylePreferences } from "@/types/api";

interface ApplyModalProps {
  open: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  listingImage: string | null;
}

export default function ApplyModal({
  open,
  onClose,
  listingId,
  listingTitle,
  listingImage,
}: ApplyModalProps) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const storedPrefs =
    (user?.lifestyle_preferences as ListingLifestylePreferences | null) ?? {};
  const [message, setMessage] = useState("");
  const [lifestyleData, setLifestyleData] =
    useState<ListingLifestylePreferences>(storedPrefs);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    ...applyMutation,
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["applications", "my"] });
    },
  });

  function handleSubmit() {
    mutation.mutate({ listing_id: listingId, message, lifestyle_data: lifestyleData });
  }

  if (success) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="bg-card-dark border-white/10 text-white max-w-md">
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center">
              <Send className="h-7 w-7 text-green-400" />
            </div>
            <h3 className="text-xl font-bold">Application Sent!</h3>
            <p className="text-gray-400 text-center text-sm">
              The listing owner will review your application and get back to you.
            </p>
            <Button onClick={onClose} className="mt-2">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const hasNoPrefs = Object.keys(storedPrefs).length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card-dark border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Apply to Live Here</DialogTitle>
        </DialogHeader>

        {/* Listing context */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10 mb-4">
          {listingImage && (
            <Image
              src={listingImage}
              alt={listingTitle}
              width={56}
              height={56}
              className="w-14 h-14 rounded-lg object-cover shrink-0"
            />
          )}
          <p className="text-sm font-semibold text-white leading-snug">
            {listingTitle}
          </p>
        </div>

        {/* Message */}
        <div className="space-y-1.5 mb-4">
          <label className="text-sm font-medium text-gray-300">
            Introduce yourself
          </label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Hi, I'm looking for a quiet place near work..."
            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 min-h-[90px] resize-none"
          />
        </div>

        {/* Lifestyle prefs */}
        <div className="border border-white/10 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-white">Your Roommate Profile</p>
            {!hasNoPrefs && (
              <span className="text-xs text-primary">pre-filled from profile</span>
            )}
          </div>
          {hasNoPrefs && (
            <p className="text-xs text-amber-400 mb-3">
              Complete your profile for a better compatibility score.
            </p>
          )}
          <LifestylePrefsForm
            initialPrefs={storedPrefs}
            onChange={setLifestyleData}
          />
        </div>

        {/* Error */}
        {mutation.isError && (
          <p className="text-sm text-red-400 mb-3">
            {(mutation.error as Error)?.message ?? "Failed to send application."}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="w-full"
        >
          {mutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Application
        </Button>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared-housing/ApplyModal.tsx
git commit -m "feat(shared-housing): add ApplyModal component"
```

---

## Task 10: Feature B — ApplyButton + wire to property page

**Files:**
- Create: `frontend/src/components/shared-housing/ApplyButton.tsx`
- Modify: `frontend/src/app/property/[id]/page.tsx`

- [ ] **Step 1: Create ApplyButton client component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ApplyModal from "@/components/shared-housing/ApplyModal";
import { useAuthStore } from "@/stores/authStore";

interface ApplyButtonProps {
  listingId: string;
  listingTitle: string;
  listingImage: string | null;
  ownerId: string;
}

export default function ApplyButton({
  listingId,
  listingTitle,
  listingImage,
  ownerId,
}: ApplyButtonProps) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  // Don't render if user is the owner
  if (user?.id === ownerId) return null;

  function handleClick() {
    if (!user) {
      router.push(`/login?redirect=/property/${listingId}`);
      return;
    }
    setOpen(true);
  }

  return (
    <>
      <Button onClick={handleClick} className="w-full gap-2" size="lg">
        <UserPlus className="h-4 w-4" />
        Apply to Live Here
      </Button>
      <ApplyModal
        open={open}
        onClose={() => setOpen(false)}
        listingId={listingId}
        listingTitle={listingTitle}
        listingImage={listingImage}
      />
    </>
  );
}
```

- [ ] **Step 2: Add ApplyButton to shared-housing layout in property page**

In `frontend/src/app/property/[id]/page.tsx`, add the import (this is a server component — the client component will be rendered inside):

```typescript
import ApplyButton from "@/components/shared-housing/ApplyButton";
```

In the `if (property.category === "shared_housing")` branch, find the `<SharedHousingSidebar>` component inside the JSX. Add `<ApplyButton>` just above the closing tag of the sidebar wrapper `<div className="lg:w-[30%]">`:

```tsx
<div className="lg:w-[30%]">
  <SharedHousingSidebar
    housing={housing}
    contactPhone={property.contactPhone}
    contactName={property.contactName}
  />
  <div className="mt-4">
    <ApplyButton
      listingId={property.id}
      listingTitle={property.title}
      listingImage={property.images[0] ?? null}
      ownerId={property.ownerId}
    />
  </div>
</div>
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared-housing/ApplyButton.tsx \
        frontend/src/app/property/[id]/page.tsx
git commit -m "feat(property): add Apply to Live Here button for shared housing listings"
```

---

## Task 11: Feature B — ApplicationsReceivedTab

**Files:**
- Create: `frontend/src/components/dashboard/ApplicationsReceivedTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { applicationsQueries, updateApplicationMutation } from "@/lib/queries";
import type { ApiDashboardListing } from "@/types/api";

interface ApplicationsReceivedTabProps {
  listings: ApiDashboardListing[];
}

function CompatBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const colorClass =
    score >= 80
      ? "bg-green-500/20 text-green-400 border-green-500/30"
      : score >= 60
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : "bg-white/10 text-gray-400 border-white/20";
  return (
    <span
      className={`text-xs font-bold px-2 py-0.5 rounded-full border ${colorClass}`}
    >
      {score}% match
    </span>
  );
}

function ListingApplications({ listing }: { listing: ApiDashboardListing }) {
  const [expanded, setExpanded] = useState(true);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(applicationsQueries.received(listing.id));

  const mutation = useMutation({
    ...updateApplicationMutation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["applications", "received", listing.id],
      });
    },
  });

  const apps = data ?? [];
  const pending = apps.filter((a) => a.status === "pending");

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden mb-4">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center gap-3">
          {listing.images?.[0] && (
            <Image
              src={listing.images[0]}
              alt={listing.title}
              width={40}
              height={40}
              className="w-10 h-10 rounded-lg object-cover"
            />
          )}
          <div className="text-left">
            <p className="text-white font-semibold text-sm">{listing.title}</p>
            <p className="text-gray-400 text-xs">{listing.location}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {pending.length > 0 && (
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
              {pending.length} pending
            </Badge>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-white/10 divide-y divide-white/5">
          {isLoading && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}
          {!isLoading && apps.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-6">
              No applications yet.
            </p>
          )}
          {apps.map((app) => (
            <div key={app.id} className="p-4 flex items-start gap-3">
              <Avatar className="h-9 w-9 shrink-0">
                {app.applicant_avatar ? (
                  <img src={app.applicant_avatar} alt={app.applicant_name ?? ""} />
                ) : (
                  <AvatarFallback className="bg-white/10 text-white text-xs">
                    {(app.applicant_name ?? "?")[0].toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-white font-semibold text-sm">
                    {app.applicant_name ?? "Applicant"}
                  </span>
                  <CompatBadge score={app.compatibility_score} />
                </div>
                <p className="text-gray-400 text-xs truncate">{app.message}</p>
                <p className="text-gray-600 text-xs mt-0.5">
                  {new Date(app.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {app.status === "pending" ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-green-400 hover:bg-green-500/10 hover:text-green-400"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ id: app.id, status: "approved" })
                      }
                    >
                      <Check className="h-4 w-4 mr-1" /> Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-3 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                      disabled={mutation.isPending}
                      onClick={() =>
                        mutation.mutate({ id: app.id, status: "rejected" })
                      }
                    >
                      <X className="h-4 w-4 mr-1" /> Reject
                    </Button>
                  </>
                ) : (
                  <Badge
                    className={
                      app.status === "approved"
                        ? "bg-green-500/20 text-green-400"
                        : "bg-red-500/20 text-red-400"
                    }
                  >
                    {app.status}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ApplicationsReceivedTab({
  listings,
}: ApplicationsReceivedTabProps) {
  const sharedListings = listings.filter(
    (l) => l.category === "shared_housing"
  );

  if (sharedListings.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm">
          You have no shared housing listings. Add one to start receiving applications.
        </p>
      </div>
    );
  }

  return (
    <div>
      {sharedListings.map((listing) => (
        <ListingApplications key={listing.id} listing={listing} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/ApplicationsReceivedTab.tsx
git commit -m "feat(dashboard): add ApplicationsReceivedTab component"
```

---

## Task 12: Feature B — MyApplicationsTab

**Files:**
- Create: `frontend/src/components/dashboard/MyApplicationsTab.tsx`

- [ ] **Step 1: Create the component**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { applicationsQueries } from "@/lib/queries";

const STATUS_STYLES = {
  pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  approved: "bg-green-500/20 text-green-400 border-green-500/30",
  rejected: "bg-red-500/20 text-red-400 border-red-500/30",
} as const;

const STATUS_LABELS = {
  pending: "Pending",
  approved: "Approved ✓",
  rejected: "Rejected",
} as const;

export default function MyApplicationsTab() {
  const { data, isLoading } = useQuery(applicationsQueries.my());
  const apps = data ?? [];

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (apps.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400 text-sm">
          You haven&apos;t applied to any shared housing listings yet.
        </p>
        <Link
          href="/shared-housing"
          className="mt-3 inline-block text-primary text-sm font-medium hover:underline"
        >
          Browse available rooms →
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {apps.map((app) => (
        <div
          key={app.id}
          className="flex items-center gap-4 p-4 rounded-xl border border-white/10 bg-white/3 hover:bg-white/5 transition-colors"
        >
          {app.listing_image && (
            <Image
              src={app.listing_image}
              alt={app.listing_title}
              width={56}
              height={56}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm truncate">
              {app.listing_title}
            </p>
            <p className="text-gray-400 text-xs mt-0.5">{app.listing_location}</p>
            <p className="text-gray-600 text-xs mt-0.5">
              Applied {new Date(app.created_at).toLocaleDateString()}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Badge className={`text-xs border ${STATUS_STYLES[app.status]}`}>
              {STATUS_LABELS[app.status]}
            </Badge>
            {app.compatibility_score !== null && (
              <span className="text-xs text-gray-500">
                {app.compatibility_score}% match
              </span>
            )}
            <Link
              href={`/property/${app.listing_id}`}
              className="text-primary hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/dashboard/MyApplicationsTab.tsx
git commit -m "feat(dashboard): add MyApplicationsTab component"
```

---

## Task 13: Feature B — Wire application tabs to dashboard page

**Files:**
- Modify: `frontend/src/app/dashboard/page.tsx`

- [ ] **Step 1: Add imports**

Add to the imports in `frontend/src/app/dashboard/page.tsx`:

```typescript
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import ApplicationsReceivedTab from "@/components/dashboard/ApplicationsReceivedTab";
import MyApplicationsTab from "@/components/dashboard/MyApplicationsTab";
```

- [ ] **Step 2: Replace bottom sections with a tabbed layout**

The current dashboard renders stacked sections. Replace the bottom portion (starting from `<div className="mb-8"><LikedProperties /></div>` through to `<AddListingModal .../>`) with:

```tsx
<Tabs defaultValue="listings" className="mt-8">
  <TabsList className="bg-white/5 border border-white/10 mb-6 h-auto flex-wrap">
    <TabsTrigger value="listings" className="data-[state=active]:bg-primary data-[state=active]:text-white">
      My Listings
    </TabsTrigger>
    <TabsTrigger value="applications-received" className="data-[state=active]:bg-primary data-[state=active]:text-white">
      Applications Received
      {(data?.pending_applications ?? 0) > 0 && (
        <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {data?.pending_applications}
        </span>
      )}
    </TabsTrigger>
    <TabsTrigger value="my-applications" className="data-[state=active]:bg-primary data-[state=active]:text-white">
      My Applications
    </TabsTrigger>
    <TabsTrigger value="liked" className="data-[state=active]:bg-primary data-[state=active]:text-white">
      Liked
    </TabsTrigger>
    <TabsTrigger value="viewings" className="data-[state=active]:bg-primary data-[state=active]:text-white">
      Viewings
    </TabsTrigger>
  </TabsList>

  <TabsContent value="listings">
    <MyListings listings={listings} onAddNew={() => setModalOpen(true)} />
  </TabsContent>

  <TabsContent value="applications-received">
    <ApplicationsReceivedTab listings={data?.listings ?? []} />
  </TabsContent>

  <TabsContent value="my-applications">
    <MyApplicationsTab />
  </TabsContent>

  <TabsContent value="liked">
    <LikedProperties />
  </TabsContent>

  <TabsContent value="viewings">
    <MyViewings viewings={viewings} />
  </TabsContent>
</Tabs>

<AddListingModal open={modalOpen} onClose={() => setModalOpen(false)} />
```

> **Note:** The existing `<DashboardStats>` and `<DashboardProfile>` remain above the tabs. The `<LikedProperties>` and `<MyViewings>` components that were separate sections are now inside tab panels.

Also update the data source — the `data` object from `useQuery` currently comes from `getDashboardListings`. Update that query to use the full dashboard endpoint so `data.pending_applications` is available:

Find:
```typescript
const { data, isLoading, isError } = useQuery({
  queryKey: ["dashboard", user?.id],
  queryFn: () => getDashboardListings(user?.id ?? ""),
  enabled: !!user?.id,
});
```

Replace with:
```typescript
import { dashboardQueries } from "@/lib/queries";
// ...
const { data, isLoading, isError } = useQuery({
  ...dashboardQueries.me(),
  enabled: !!user?.id,
});
```

> **Note:** Check if `dashboardQueries` exists in `queries.ts`. If not, add it:
> ```typescript
> export const dashboardQueries = {
>   me: () => ({
>     queryKey: ["dashboard"],
>     queryFn: () => api.get<DashboardResponse>("/api/dashboard/me"),
>   }),
> };
> ```
> After switching, update the field references in `dashboard/page.tsx` — `getDashboardListings` returned `{ active, pending, listings }` but `DashboardResponse` uses different names:
> - `data?.active` → `data?.active_count`
> - `data?.pending` → `data?.pending_count`
> - `data?.listings` → `data?.listings` (unchanged)
> - `data?.pending_applications` → now available (was missing before)

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/dashboard/page.tsx frontend/src/lib/queries.ts
git commit -m "feat(dashboard): add Applications Received and My Applications tabs"
```

---

## Task 14: Feature C — SharedHousingCard

**Files:**
- Create: `frontend/src/components/shared-housing/SharedHousingCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import Image from "next/image";
import Link from "next/link";
import { Users, Zap, Bath } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatEGP } from "@/lib/utils";
import type { ListingBrief } from "@/types/api";

interface SharedHousingCardProps {
  listing: ListingBrief & {
    total_spots?: number | null;
    filled_spots?: number | null;
    utilities_included?: boolean;
    room_type?: string | null;
    lifestyle_preferences?: { gender_preference?: string | null } | null;
    housemate_avatars?: string[];
  };
  compatScore?: number | null;
}

export default function SharedHousingCard({
  listing,
  compatScore,
}: SharedHousingCardProps) {
  const openSpots =
    listing.total_spots != null && listing.filled_spots != null
      ? listing.total_spots - listing.filled_spots
      : null;

  const genderPref = listing.lifestyle_preferences?.gender_preference;

  const genderLabel =
    genderPref === "male"
      ? "Males only"
      : genderPref === "female"
      ? "Females only"
      : null;

  return (
    <Link
      href={`/property/${listing.id}`}
      className="group block rounded-2xl border border-white/10 bg-card-dark overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/5"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={
            listing.images[0] ??
            "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600"
          }
          alt={listing.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        {/* Compat badge overlay */}
        {compatScore !== null && compatScore !== undefined && (
          <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-green-400 text-xs font-bold px-2 py-1 rounded-full border border-green-500/30">
            {compatScore}% match
          </div>
        )}
        {/* Spots badge */}
        {openSpots !== null && (
          <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
            <Users className="h-3 w-3" />
            {openSpots > 0 ? `${openSpots} spot${openSpots > 1 ? "s" : ""} open` : "Full"}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2">
        <p className="text-white font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {listing.title}
        </p>
        <p className="text-gray-400 text-xs truncate">{listing.location}</p>

        {/* Chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {genderLabel && (
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[10px] px-2 py-0.5">
              {genderLabel}
            </Badge>
          )}
          {listing.utilities_included && (
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-2 py-0.5">
              <Zap className="h-2.5 w-2.5 mr-1" />
              Bills incl.
            </Badge>
          )}
          {listing.room_type && (
            <Badge className="bg-white/10 text-gray-300 border-white/20 text-[10px] px-2 py-0.5">
              <Bath className="h-2.5 w-2.5 mr-1" />
              {listing.room_type}
            </Badge>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline justify-between pt-1">
          <span className="text-white font-bold text-base">
            {formatEGP(listing.price)}
          </span>
          <span className="text-gray-500 text-xs">/month</span>
        </div>
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/shared-housing/SharedHousingCard.tsx
git commit -m "feat(shared-housing): add SharedHousingCard component"
```

---

## Task 15: Feature C — SharedHousingFilters + ForYouSection

**Files:**
- Create: `frontend/src/components/shared-housing/SharedHousingFilters.tsx`
- Create: `frontend/src/components/shared-housing/ForYouSection.tsx`

- [ ] **Step 1: Create SharedHousingFilters**

```tsx
"use client";

import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SharedHousingParams } from "@/lib/queries";

interface SharedHousingFiltersProps {
  filters: SharedHousingParams;
  onChange: (filters: SharedHousingParams) => void;
}

const ROOM_TYPES = ["private", "ensuite", "shared"] as const;

export default function SharedHousingFilters({
  filters,
  onChange,
}: SharedHousingFiltersProps) {
  function set<K extends keyof SharedHousingParams>(
    key: K,
    value: SharedHousingParams[K]
  ) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({});
  }

  const hasActive = Object.values(filters).some(
    (v) => v !== undefined && v !== null
  );

  return (
    <div className="flex flex-wrap items-center gap-2 p-4 rounded-2xl border border-white/10 bg-white/3">
      {/* Gender chips */}
      {(["female", "male"] as const).map((g) => (
        <button
          key={g}
          onClick={() =>
            set(
              "gender_preference",
              filters.gender_preference === g ? undefined : g
            )
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            filters.gender_preference === g
              ? "bg-primary text-white border-primary"
              : "bg-white/5 text-gray-300 border-white/10 hover:border-primary/40"
          }`}
        >
          {g === "female" ? "🙍‍♀️ Females only" : "🙍‍♂️ Males only"}
        </button>
      ))}

      {/* Divider */}
      <div className="h-5 w-px bg-white/10 hidden sm:block" />

      {/* Room type chips */}
      {ROOM_TYPES.map((rt) => (
        <button
          key={rt}
          onClick={() =>
            set("room_type", filters.room_type === rt ? undefined : rt)
          }
          className={`px-3 py-1.5 rounded-full text-xs font-medium border capitalize transition-all ${
            filters.room_type === rt
              ? "bg-primary text-white border-primary"
              : "bg-white/5 text-gray-300 border-white/10 hover:border-primary/40"
          }`}
        >
          {rt}
        </button>
      ))}

      {/* Divider */}
      <div className="h-5 w-px bg-white/10 hidden sm:block" />

      {/* Utilities toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Switch
          checked={filters.utilities_included ?? false}
          onCheckedChange={(v) => set("utilities_included", v || undefined)}
          className="scale-90"
        />
        <span className="text-xs text-gray-300 whitespace-nowrap">Bills incl.</span>
      </label>

      {/* Has spots toggle */}
      <label className="flex items-center gap-2 cursor-pointer">
        <Switch
          checked={filters.has_spots ?? false}
          onCheckedChange={(v) => set("has_spots", v || undefined)}
          className="scale-90"
        />
        <span className="text-xs text-gray-300 whitespace-nowrap">Has spots</span>
      </label>

      {/* Move-in date */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-400 whitespace-nowrap">Move in before</span>
        <Input
          type="date"
          value={filters.available_before ?? ""}
          onChange={(e) =>
            set("available_before", e.target.value || undefined)
          }
          className="h-7 text-xs w-32 bg-white/5 border-white/10 text-white"
        />
      </div>

      {/* Clear */}
      {hasActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          className="text-xs text-gray-400 hover:text-white h-7 px-2"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create ForYouSection**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import SharedHousingCard from "@/components/shared-housing/SharedHousingCard";
import { sharedHousingQueries } from "@/lib/queries";
import { useAuthStore } from "@/stores/authStore";
import type { ListingLifestylePreferences } from "@/types/api";

export default function ForYouSection() {
  const { user } = useAuthStore();

  const hasPrefs =
    user?.lifestyle_preferences &&
    Object.keys(user.lifestyle_preferences as object).length > 0;

  const { data } = useQuery({
    ...sharedHousingQueries.recommendations(),
    enabled: !!user && !!hasPrefs,
  });

  const listings = data ?? [];

  if (!user || !hasPrefs || listings.length === 0) return null;

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="text-white font-bold text-base">Suggested for you</h2>
        <span className="text-gray-500 text-xs">based on your roommate profile</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {listings.slice(0, 4).map((listing) => (
          <SharedHousingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/shared-housing/SharedHousingFilters.tsx \
        frontend/src/components/shared-housing/ForYouSection.tsx
git commit -m "feat(shared-housing): add SharedHousingFilters and ForYouSection"
```

---

## Task 16: Feature C — `/shared-housing` page

**Files:**
- Create: `frontend/src/app/shared-housing/page.tsx`

> **Note:** `frontend/src/app/shared-housing/[id]/page.tsx` already exists and redirects to `/property/[id]`. The new file is at the parent route — no conflict.

- [ ] **Step 1: Create the page**

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import SharedHousingFilters from "@/components/shared-housing/SharedHousingFilters";
import SharedHousingCard from "@/components/shared-housing/SharedHousingCard";
import ForYouSection from "@/components/shared-housing/ForYouSection";
import { sharedHousingQueries } from "@/lib/queries";
import type { SharedHousingParams } from "@/lib/queries";

export default function SharedHousingPage() {
  const [filters, setFilters] = useState<SharedHousingParams>({});

  const { data, isLoading } = useQuery(sharedHousingQueries.list(filters));
  const listings = data?.listings ?? [];

  return (
    <div className="max-w-7xl 2xl:max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Shared Housing</h1>
        <p className="text-gray-400 mt-1">
          Find a room and meet compatible housemates
        </p>
      </div>

      {/* Filters */}
      <div className="mb-8">
        <SharedHousingFilters filters={filters} onChange={setFilters} />
      </div>

      {/* AI-ranked "For You" section */}
      <ForYouSection />

      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-400">No listings match your filters.</p>
        </div>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-4">
            {data?.total ?? listings.length} listings found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {listings.map((listing) => (
              <SharedHousingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/shared-housing/page.tsx
git commit -m "feat: add /shared-housing dedicated search page"
```

---

## Task 17: Final checks and docs update

**Files:**
- Modify: `docs/ROADMAP.md`
- Modify: `memory/MEMORY.md`

- [ ] **Step 1: Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step 2: Add Shared Housing link to Navbar (if missing)**

Check `frontend/src/components/layout/Navbar.tsx`. If `/shared-housing` is not in the nav items, add it to `frontend/src/lib/constants.ts` nav array:

```typescript
{ label: "Shared Housing", href: "/shared-housing" }
```

- [ ] **Step 3: Update ROADMAP.md**

Mark the shared housing features as complete in `docs/ROADMAP.md`.

- [ ] **Step 4: Final commit**

```bash
git add docs/ROADMAP.md
git commit -m "docs: mark shared housing features complete in roadmap"
```

---

## Summary

| Task | Scope | Commits |
|---|---|---|
| 1 | Types | 1 |
| 2 | Query layer | 1 |
| 3 | Backend: listing filters | 1 |
| 4 | Backend: applications router | 1 |
| 5 | Backend: dashboard count | 1 |
| 6 | Backend: recommendations category | 1 |
| 7 | Feature A: LifestylePrefsForm | 1 |
| 8 | Feature A: Dashboard wire | 1 |
| 9 | Feature B: ApplyModal | 1 |
| 10 | Feature B: ApplyButton + property page | 1 |
| 11 | Feature B: ApplicationsReceivedTab | 1 |
| 12 | Feature B: MyApplicationsTab | 1 |
| 13 | Feature B: Dashboard tabs | 1 |
| 14 | Feature C: SharedHousingCard | 1 |
| 15 | Feature C: Filters + ForYouSection | 1 |
| 16 | Feature C: /shared-housing page | 1 |
| 17 | Final checks + docs | 1 |
| **Total** | | **17 commits** |
