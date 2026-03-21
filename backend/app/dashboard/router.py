from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()


@router.get("/me")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Unified dashboard endpoint. Returns all data needed to render the dashboard page:
    - profile summary
    - analytics (views, active/pending listings, favorites count)
    - user's own listings
    - recent message conversations (last 5)
    - favorited properties
    - upcoming viewings
    """
    user_id = current_user["id"]

    # ── Profile ──────────────────────────────────────────────────────────────
    profile = {
        "full_name": current_user.get("full_name"),
        "avatar_url": current_user.get("avatar_url"),
        "is_verified_seller": current_user.get("is_verified_seller", False),
        "bio": current_user.get("bio"),
        "phone": current_user.get("phone"),
        "country_code": current_user.get("country_code"),
    }

    # ── User Listings ─────────────────────────────────────────────────────────
    try:
        listings_result = (
            supabase_admin.table("listings")
            .select("id, title, location, price, images, status, views_count, created_at")
            .eq("owner_id", user_id)
            .is_("deleted_at", "null")
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
            "price": float(l["price"]),
            "images": l.get("images") or [],
            "status": l["status"],
            "views_count": l.get("views_count", 0),
        }
        for l in user_listings
    ]

    # ── Recent Messages ───────────────────────────────────────────────────────
    recent_messages = []
    try:
        conv_result = supabase_admin.rpc(
            "get_user_conversations", {"p_user_id": user_id}
        ).execute()
        conversations = (conv_result.data or [])[:5]

        for conv in conversations:
            other_user_id = conv.get("other_user_id")
            if not other_user_id:
                continue

            # Fetch other user's profile
            try:
                other_profile_result = (
                    supabase_admin.table("profiles")
                    .select("full_name, avatar_url")
                    .eq("id", other_user_id)
                    .single()
                    .execute()
                )
                other_profile = other_profile_result.data or {}
            except Exception:
                other_profile = {}

            # Fetch last message in conversation
            try:
                last_msg_result = (
                    supabase_admin.table("messages")
                    .select("text, created_at")
                    .eq("conversation_id", conv["conversation_id"])
                    .order("created_at", desc=True)
                    .limit(1)
                    .execute()
                )
                last_msg = (last_msg_result.data or [{}])[0]
            except Exception:
                last_msg = {}

            recent_messages.append({
                "conversation_id": conv["conversation_id"],
                "other_user_name": other_profile.get("full_name", "Unknown"),
                "other_user_avatar": other_profile.get("avatar_url"),
                "last_message_text": last_msg.get("text", ""),
                "last_message_at": last_msg.get("created_at") or conv.get("last_message_at"),
                "unread_count": int(conv.get("unread_count", 0)),
            })
    except Exception:
        pass

    # ── Liked Properties ──────────────────────────────────────────────────────
    liked_properties = []
    try:
        fav_listings_result = (
            supabase_admin.table("favorites")
            .select("listing_id, created_at, listings(id, title, location, price, images, bedrooms, bathrooms, property_type)")
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
        "recent_messages": recent_messages,
        "liked_properties": liked_properties,
        "upcoming_viewings": upcoming_viewings,
    }
