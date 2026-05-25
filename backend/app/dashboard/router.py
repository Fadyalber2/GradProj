from datetime import date

from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()


def _age_from_birth_date(value: str | None) -> int | None:
    if not value:
        return None
    try:
        born = date.fromisoformat(value[:10])
    except ValueError:
        return None
    today = date.today()
    return today.year - born.year - ((today.month, today.day) < (born.month, born.day))


@router.get("/me")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Unified dashboard endpoint. Returns all data needed to render the dashboard page:
    - profile summary
    - analytics (views, active/pending listings, favorites count)
    - user's own listings
    - favorited properties
    - upcoming viewings
    """
    user_id = current_user["id"]

    # ── Profile ──────────────────────────────────────────────────────────────
    profile = {
        "id": current_user.get("id"),
        "email": current_user.get("email"),
        "full_name": current_user.get("full_name"),
        "avatar_url": current_user.get("avatar_url"),
        "phone": current_user.get("phone"),
        "whatsapp_number": current_user.get("whatsapp_number"),
        "bio": current_user.get("bio"),
        "role": current_user.get("role", "user"),
        "is_verified_seller": current_user.get("is_verified_seller", False),
        "gender": current_user.get("gender"),
        "country_code": current_user.get("country_code"),
        "badges": current_user.get("badges") or [],
        "birth_date": current_user.get("birth_date"),
        "age": _age_from_birth_date(current_user.get("birth_date")) or current_user.get("age"),
        "occupation": current_user.get("occupation"),
        "lifestyle_preferences": current_user.get("lifestyle_preferences"),
        "created_at": current_user.get("created_at"),
        "updated_at": current_user.get("updated_at"),
    }

    # ── User Listings ─────────────────────────────────────────────────────────
    try:
        listings_result = (
            supabase_admin.table("listings")
            .select("id, title, location, full_address, category, price, images, status, views_count, created_at")
            .eq("owner_id", user_id)
            .is_("deleted_at", "null")
            .neq("status", "rejected")
            .order("created_at", desc=True)
            .execute()
        )
        user_listings = listings_result.data or []
    except Exception:
        user_listings = []

    # ── Analytics ─────────────────────────────────────────────────────────────
    total_views = sum(l.get("views_count", 0) for l in user_listings)
    active_count = sum(1 for l in user_listings if l.get("status") == "active")
    pending_count = sum(1 for l in user_listings if l.get("status") == "pending")

    listing_ids = [l["id"] for l in user_listings]
    try:
        pending_apps_result = (
            supabase_admin.table("listing_applications")
            .select("id", count="exact")
            .in_("listing_id", listing_ids)
            .eq("status", "pending")
            .execute()
            if listing_ids
            else None
        )
        pending_applications = pending_apps_result.count if pending_apps_result else 0
    except Exception:
        pending_applications = 0

    # Favorites count
    try:
        fav_result = (
            supabase_admin.table("favorites")
            .select("listing_id", count="exact")
            .eq("user_id", user_id)
            .execute()
        )
        favorites_count = fav_result.count or 0
    except Exception:
        favorites_count = 0

    analytics = [
        {
            "label": "Total Views",
            "value": f"{total_views:,}",
            "trend_percent": 0.0,
            "trend_up": True,
        },
        {
            "label": "Active Listings",
            "value": str(active_count),
            "trend_percent": 0.0,
            "trend_up": True,
        },
        {
            "label": "Pending Approval",
            "value": str(pending_count),
            "trend_percent": 0.0,
            "trend_up": False,
        },
        {
            "label": "Saved Properties",
            "value": str(favorites_count),
            "trend_percent": 0.0,
            "trend_up": True,
        },
    ]

    # ── Dashboard Listings Shape ───────────────────────────────────────────────
    dashboard_listings = [
        {
            "id": l["id"],
            "title": l["title"],
            "location": l["location"],
            "full_address": l.get("full_address"),
            "category": l.get("category"),
            "price": float(l["price"]),
            "images": l.get("images") or [],
            "status": l["status"],
            "views_count": l.get("views_count", 0),
        }
        for l in user_listings
    ]

    # ── Liked Properties ──────────────────────────────────────────────────────
    liked_properties = []
    try:
        fav_listings_result = (
            supabase_admin.table("favorites")
            .select("listing_id, created_at, listings(id, title, location, price, price_period, category, images, bedrooms, bathrooms, property_type)")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )
        for row in fav_listings_result.data or []:
            listing_data = row.get("listings")
            if not listing_data:
                continue
            liked_properties.append({
                "listing_id": listing_data["id"],
                "title": listing_data["title"],
                "location": listing_data["location"],
                "images": listing_data.get("images") or [],
                "price": float(listing_data["price"]),
                "price_period": listing_data.get("price_period"),
                "category": listing_data.get("category"),
                "bedrooms": listing_data.get("bedrooms"),
                "bathrooms": listing_data.get("bathrooms"),
                "property_type": listing_data.get("property_type"),
                "created_at": row.get("created_at", ""),
            })
    except Exception:
        pass

    # ── Upcoming Viewings ─────────────────────────────────────────────────────
    upcoming_viewings = []
    try:
        now_iso = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
        viewings_result = (
            supabase_admin.table("viewings")
            .select("id, scheduled_at, status, listings(title, images)")
            .or_(f"requester_id.eq.{user_id},owner_id.eq.{user_id}")
            .in_("status", ["pending", "confirmed"])
            .gte("scheduled_at", now_iso)
            .order("scheduled_at", desc=False)
            .limit(10)
            .execute()
        )
        for v in viewings_result.data or []:
            listing_data = v.get("listings") or {}
            images = listing_data.get("images") or []
            upcoming_viewings.append({
                "id": v["id"],
                "listing_title": listing_data.get("title", ""),
                "listing_image": images[0] if images else None,
                "scheduled_at": v["scheduled_at"],
                "status": v["status"],
            })
    except Exception:
        pass

    return {
        "profile": profile,
        "analytics": analytics,
        "listings": dashboard_listings,
        "listings_count": len(dashboard_listings),
        "active_count": active_count,
        "pending_count": pending_count,
        "liked_properties": liked_properties,
        "liked_count": favorites_count,
        "upcoming_viewings": upcoming_viewings,
        "pending_applications": pending_applications,
    }
