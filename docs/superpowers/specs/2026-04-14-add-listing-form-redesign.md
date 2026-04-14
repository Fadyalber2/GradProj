# Add Listing Form Redesign

**Date:** 2026-04-14  
**Status:** Approved  
**Approach:** B — Reorganised sections (single scrollable modal)

---

## Problem Statement

The current `AddListingModal` has multiple silent failures that prevent listings from ever being saved correctly, plus missing fields and dead UI elements. This spec covers bug fixes, missing fields, and three user-requested features.

---

## Critical Bug Fixes

| Bug | Current Behaviour | Fix |
|-----|------------------|-----|
| Category values wrong | sends `"rent"/"buy"/"shared"` | send `"for_rent"/"for_sale"/"shared_housing"` |
| `property_type` never sent | field missing from payload | new required dropdown, value sent as-is |
| `city` never sent | field missing from payload | extracted from Nominatim geocoding response |
| `latitude`/`longitude` never sent | missing from payload | extracted from Nominatim geocoding response |
| `status` field sent | frontend sends `"draft"/"active"`, backend always overrides to `"pending"` | remove from payload entirely |
| "Save as Draft" button | exists but useless | removed; replaced with plain "Cancel" |
| Status badges | success/error badge for draft/active | removed |
| Photo upload decorative | `<div>` with no `<input>` | wire real `<input type="file" multiple accept="image/*">` |
| Size label wrong | shows "sqft" | fix to "sqm" to match backend field `size_sqm` |
| "+ Add" amenity button dead | renders but does nothing | opens inline text input for custom amenities |

---

## Form Structure

Single scrollable modal. Fields grouped into six labeled sections separated by subtle dividers.

### Section 1 — Basics
| Field | Type | Backend field | Notes |
|-------|------|--------------|-------|
| Listing Name | text input | `title` | required |
| Listing Category | dropdown | `category` | `for_rent`, `for_sale`, `shared_housing` — display labels: "For Rent", "For Sale", "Shared Housing" |
| Property Type | dropdown | `property_type` | `Apartment`, `Villa`, `Studio`, `Penthouse`, `Duplex`, `Townhouse`, `Chalet`, `Office`, `Shop` |

### Section 2 — Location
| Field | Type | Backend field | Notes |
|-------|------|--------------|-------|
| Address search | text input with Nominatim suggestions | `full_address`, `city`, `latitude`, `longitude`, `location` | Debounced (400ms). Dropdown of up to 5 results. On select: auto-fills all location fields |
| Map preview | react-leaflet mini map (120px tall) | — | Appears only after address is selected. Shows draggable pin. Drag updates lat/lng. |

**Nominatim integration:**
- Endpoint: `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=<query>&limit=5`
- City extracted from: `address.city` → `address.town` → `address.county` (first non-null)
- `location` field set to: `"{neighborhood or suburb}, {city}"` or just `city` if no suburb
- User-Agent header must be set (OSM requirement): `"AXIOM-V2/1.0"`
- No API key required

### Section 3 — Property Details
| Field | Type | Backend field | Notes |
|-------|------|--------------|-------|
| Price | number input with EGP prefix | `price` | required |
| Size | number input with sqm suffix | `size_sqm` | optional |
| Rooms | stepper (min 0) | `bedrooms` | keep existing counter UI |
| Bathrooms | stepper (min 0) | `bathrooms` | keep existing counter UI |
| Floor Number | number input | `floor_number` | optional |
| Furnishing | dropdown | `furnishing` | `Furnished`, `Semi-Furnished`, `Unfurnished` |

### Section 4 — Amenities
- Preset chips: Parking, Swimming Pool, Gym, Garden, Security, Elevator, Central AC, Balcony, Storage Room, Maid's Room (expanded list from current 5)
- Active chip shows an X to deselect
- Custom input: inline text field with placeholder "Add custom amenity…" + Enter to submit
- On Enter: call `POST /api/ai/validate-amenity`
  - If `ok: true` → add chip to list
  - If `ok: false` → show inline error below input: `"Flagged: {reason}"`, do not add chip
  - While checking: show spinner on the input, disable Enter
- No AI check on preset chips (trusted list)

### Section 5 — Photos
- Click or drag-and-drop zone (existing UI, now functional)
- Hidden `<input type="file" multiple accept="image/*" ref>` triggered by clicking the zone
- After selection: show thumbnail grid (3 per row, 80px tall each) with individual remove buttons
- Images sent as `[]` in the submission payload for now (upload endpoint wiring is a separate task)

### Section 6 — Description
- Language toggle (English / Arabic / Both) — keep as-is
- "Generate with AI" button — keep as-is
- Textarea — keep as-is

---

## Footer
- Left side: "Listings are reviewed by an admin before going live." (gray text)
- Right side: single **Submit for Review** button (primary orange)
- Error message shown above footer if validation fails

---

## Validation (client-side, on submit)
- `title` — required, non-empty
- `full_address` — required (must have selected from Nominatim, not just typed)
- `price` — required, must be > 0
- `property_type` — required (dropdown, always has a value)
- `category` — required (dropdown, always has a value)
- Show inline error per field on failure; do not call API until all required fields pass

---

## Backend — New Endpoint

**`POST /api/ai/validate-amenity`**  
File: `backend/app/ai/router.py`

Request body (new Pydantic model in `backend/app/ai/schemas.py` or inline):
```python
class AmenityValidationRequest(BaseModel):
    amenity: str
```

Response:
```json
{ "ok": true, "reason": "" }
{ "ok": false, "reason": "Contains inappropriate content" }
```

Logic:
1. If `amenity` is empty or whitespace → return `{ "ok": false, "reason": "Amenity name cannot be empty" }`
2. If Ollama is down (health check fails) → return `{ "ok": true }` (fail-open)
3. Call Ollama with system prompt scoped to real estate amenity validation
4. Parse JSON response for `{ "appropriate": true/false, "reason": "..." }`
5. Map to `{ "ok": appropriate, "reason": reason }`

System prompt:
```
You are a content moderation system for a real estate platform.
Determine whether the given amenity name is appropriate for a property listing.
Flag anything that is: offensive, sexual, discriminatory, nonsensical, or unrelated to real estate.
Legitimate examples: "Rooftop Terrace", "Private Entrance", "Solar Panels".
Return ONLY valid JSON: {"appropriate": true, "reason": ""} or {"appropriate": false, "reason": "short reason"}
```

---

## State Management

Convert from uncontrolled refs to controlled React state for all fields (current mix of `useRef` + `useState` is fragile and makes validation hard):

```typescript
interface FormState {
  title: string;
  category: string;         // "for_rent" | "for_sale" | "shared_housing"
  property_type: string;    // "Apartment" | "Villa" | etc.
  full_address: string;
  city: string;
  latitude: number | null;
  longitude: number | null;
  location: string;
  price: string;
  size_sqm: string;
  bedrooms: number;
  bathrooms: number;
  floor_number: string;
  furnishing: string;
  amenities: string[];
  description: string;
  descLang: "english" | "arabic" | "both";
}
```

---

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/components/dashboard/AddListingModal.tsx` | Full rewrite with new structure |
| `frontend/src/lib/constants.ts` | Expand `LISTING_AMENITIES`, add `PROPERTY_TYPES`, add `FURNISHING_OPTIONS` |
| `backend/app/ai/router.py` | Add `POST /api/ai/validate-amenity` route |

---

## Out of Scope

- Actual image upload to Supabase Storage (separate task)
- Shared-housing-specific fields (`room_type`, `lifestyle_preferences`, etc.)
- Payment plan / delivery date / title deed fields (sale-specific)
- Lease type / min stay fields (rental-specific)
- Category-conditional field rendering (show lease fields only for For Rent, etc.)
