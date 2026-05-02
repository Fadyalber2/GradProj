# AXIOM V2 — API Reference

Backend base URL: `http://localhost:8000`
Auth: `Authorization: Bearer <supabase-jwt>` on all protected endpoints.

---

## Auth

| Method | Path               | Auth | Description                                                                         |
| ------ | ------------------ | ---- | ----------------------------------------------------------------------------------- |
| POST   | `/api/auth/signup` | No   | Register new user. Creates Supabase account + profile row.                          |
| POST   | `/api/auth/login`  | No   | Validate credentials (returns 200 if valid — Supabase session handled on frontend). |
| GET    | `/api/auth/me`     | Yes  | Returns current user profile.                                                       |
| PUT    | `/api/auth/me`     | Yes  | Update profile (name, phone, avatar, bio).                                          |

### POST /api/auth/signup — body

```json
{
  "email": "...",
  "password": "...",
  "full_name": "...",
  "phone": "...",
  "country_code": "+20",
  "gender": "male|female|other"
}
```

Response: `201` on success, `202` if email confirmation required.

---

## Listings

| Method | Path                 | Auth | Description                                   |
| ------ | -------------------- | ---- | --------------------------------------------- |
| GET    | `/api/listings`      | No   | Paginated listing search with filters.        |
| GET    | `/api/listings/{id}` | No   | Single listing detail + similar listings.     |
| POST   | `/api/listings`      | Yes  | Create new listing (enters `pending` status). |
| PUT    | `/api/listings/{id}` | Yes  | Update listing (owner only).                  |
| DELETE | `/api/listings/{id}` | Yes  | Soft-delete listing (owner only).             |

### GET /api/listings — query params

```
page=1&per_page=12&sort_by=newest|price_asc|price_desc|most_viewed
category=for_rent|for_sale|shared_housing
city=Cairo&min_price=5000&max_price=20000&bedrooms=2
```

### GET /api/listings — response

```json
{ "listings": [ListingBrief], "total": 120, "page": 1, "per_page": 12 }
```

### ListingBrief shape

```json
{
  "id": "uuid",
  "title": "string",
  "location": "string",
  "price": 8000,
  "category": "for_rent|for_sale|shared_housing",
  "images": ["url"],
  "verified": true,
  "is_new": false,
  "status": "active|pending|rejected"
}
```

### GET /api/listings/{id} — response (ListingDetailWithSimilar)

```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "title": "string",
  "location": "string",
  "full_address": "string",
  "price": 8000,
  "category": "for_rent|for_sale|shared_housing",
  "status": "active",
  "verified": true,
  "is_new": false,
  "images": ["url"],
  "description": "string",
  "size_sqm": 120,
  "bedrooms": 2,
  "bathrooms": 1,
  "amenities": ["string"],
  "latitude": 30.05,
  "longitude": 31.23,
  "property_type": "apartment",
  "furnishing": "furnished|semi_furnished|unfurnished",
  "floor": 3,
  "views_count": 450,
  "similar_listings": [ListingBrief],

  "total_spots": null,
  "filled_spots": null,
  "availability": null,
  "available_date": null,
  "utilities_included": null,
  "bathroom_type": null,
  "private_amenities": null,
  "shared_amenities": null,
  "housemates": null,

  "contact_phone": "201234567890",
  "contact_name": "Agency or Owner Name"
}
```

> Shared housing fields (`total_spots`, `housemates`, etc.) are `null` for non-shared listings.
> `contact_phone` is stripped of the leading `+` for direct use in `wa.me/` URLs. `null` if no phone is on record.

---

## Dashboard

| Method | Path                | Auth | Description                                  |
| ------ | ------------------- | ---- | -------------------------------------------- |
| GET    | `/api/dashboard/me` | Yes  | Unified dashboard data for the current user. |

### GET /api/dashboard/me — response (DashboardResponse)

```json
{
  "profile": {
    "full_name": "string",
    "avatar_url": "string",
    "is_verified_seller": false,
    "bio": "string",
    "phone": "string",
    "country_code": "+20"
  },
  "analytics": [
    { "label": "Total Views", "value": "1,234", "trend_percent": 12.5, "trend_up": true }
  ],
  "listings": [ApiDashboardListing],
  "liked_properties": [LikedPropertyBrief],
  "upcoming_viewings": [ApiViewingBrief]
}
```

### ApiDashboardListing

```json
{
  "id": "uuid",
  "title": "string",
  "location": "string",
  "price": 8000,
  "images": ["url"],
  "status": "active|pending|rejected|draft",
  "views_count": 120
}
```

### LikedPropertyBrief

```json
{
  "listing_id": "uuid",
  "title": "string",
  "location": "string",
  "images": ["url"],
  "price": 8000,
  "bedrooms": 2,
  "bathrooms": 1,
  "property_type": "apartment",
  "created_at": "ISO8601"
}
```

### ApiViewingBrief

```json
{
  "id": "uuid",
  "listing_title": "string",
  "listing_image": "url",
  "scheduled_at": "ISO8601",
  "status": "pending|confirmed|cancelled"
}
```

---

## Leads

| Method | Path               | Auth  | Description                                                        |
| ------ | ------------------ | ----- | ------------------------------------------------------------------ |
| POST   | `/api/leads`       | Yes   | Record a WhatsApp lead click and return the `wa.me` deep-link URL. |
| GET    | `/api/admin/leads` | Admin | List all leads with filtering and pagination.                      |

### POST /api/leads — body

```json
{ "listing_id": "uuid", "source": "whatsapp_click|schedule_viewing" }
```

Response:

```json
{
  "whatsapp_url": "https://wa.me/201234567890?text=...",
  "already_existed": false
}
```

Deduped by `(user_id, listing_id)` — repeat clicks return `already_existed: true` but still return the URL.
Requires the authenticated user to have a phone number on their profile.

### GET /api/admin/leads — query params

`agency_id?`, `source?`, `is_billable?`, `date_from?`, `date_to?`, `page?`, `per_page?`

Response:

```json
{
  "leads": [
    {
      "id": "uuid",
      "contact_name": "Buyer Name",
      "contact_phone": "201234567890",
      "listing_title": "Luxury Apartment",
      "agency_name": "Cairo Realty",
      "source": "whatsapp_click",
      "is_billable": true,
      "created_at": "ISO8601"
    }
  ],
  "total": 42,
  "page": 1,
  "per_page": 20
}
```

---

## Favorites

| Method | Path                          | Auth | Description                 |
| ------ | ----------------------------- | ---- | --------------------------- |
| POST   | `/api/listings/{id}/favorite` | Yes  | Toggle favorite.            |
| GET    | `/api/listings/favorites`     | Yes  | Get all favorited listings. |

---

## Viewings

| Method | Path                 | Auth | Description                         |
| ------ | -------------------- | ---- | ----------------------------------- |
| POST   | `/api/viewings`      | Yes  | Request a viewing.                  |
| PUT    | `/api/viewings/{id}` | Yes  | Confirm or cancel (owner confirms). |

---

## AI

| Method | Path                       | Auth | Description                                                                  |
| ------ | -------------------------- | ---- | ---------------------------------------------------------------------------- |
| POST   | `/api/ai/search`           | No   | Natural language search → structured filters + results.                      |
| POST   | `/api/ai/chat`             | No   | Streaming chatbot (SSE). Emits `listing_refs` event with matched properties. |
| GET    | `/api/ai/recommendations`  | Yes  | Property recommendations based on favorites.                                 |
| POST   | `/api/ai/compatibility`    | Yes  | Roommate compatibility score for a listing application.                      |
| POST   | `/api/ai/description`      | Yes  | Generate bilingual listing description.                                      |
| POST   | `/api/ai/validate-amenity` | Yes  | Validate and classify an amenity string.                                     |

### POST /api/ai/search — body & response

```json
// Body
{ "query": "quiet 2-bedroom near Maadi under 8000 EGP", "limit": 20 }

// Response
{
  "query": "original query",
  "parsed_filters": { "location": "Maadi", "max_price": 8000, "bedrooms": 2 },
  "results": [ListingBrief],
  "total": 5
}
```

### POST /api/ai/chat — SSE events

```
data: {"type": "token", "content": "Here are some..."}
data: {"type": "listing_refs", "listings": [ListingBrief], "source": "search"}
data: {"type": "done"}
```

---

## Admin (separate auth)

| Method | Path                                 | Description                       |
| ------ | ------------------------------------ | --------------------------------- |
| GET    | `/api/admin/listings?status=pending` | Pending listing queue.            |
| PUT    | `/api/admin/listings/{id}/approve`   | Approve listing → status=active.  |
| PUT    | `/api/admin/listings/{id}/reject`    | Reject listing with reason.       |
| GET    | `/api/admin/users`                   | All users.                        |
| PUT    | `/api/admin/users/{id}/verify`       | Grant `is_verified_seller` badge. |

---

## Error Responses

All errors follow FastAPI's default format:

```json
{ "detail": "Human-readable error message" }
```

| Status | Meaning                                                     |
| ------ | ----------------------------------------------------------- |
| 400    | Validation error (Pydantic)                                 |
| 401    | Missing or invalid JWT                                      |
| 403    | Forbidden (not owner, not admin)                            |
| 404    | Resource not found                                          |
| 503    | AI unavailable (Ollama down) — `{ "ai_unavailable": true }` |
