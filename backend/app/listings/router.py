import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends, Query
from app.listings.schemas import (
    CreateListingRequest,
    UpdateListingRequest,
    ApplyRequest,
    ListingBriefResponse,
    ListingDetailResponse,
    ListingsPageResponse,
    ApplicationDetailResponse,
    HousemateResponse,
)
from app.database import supabase_admin
from app.dependencies import get_current_user, get_optional_user
from app.ai.embeddings import embed_listing, embed_listing_chunk, delete_listing_chunk
from app.ai.fraud import score_listing

router = APIRouter()


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_listing_brief(row: dict) -> dict:
    """
    Convert a raw DB row (with optional neighborhoods join) into ListingBrief shape.
    """
    neighborhood_name: str | None = None
    nbhd = row.get("neighborhoods")
    if isinstance(nbhd, dict):
        neighborhood_name = nbhd.get("name")
    elif isinstance(nbhd, str):
        neighborhood_name = nbhd

    return {
        "id": row["id"],
        "title": row["title"],
        "location": row["location"],
        "price": float(row["price"]),
        "currency": row.get("currency", "EGP"),
        "price_period": row.get("price_period"),
        "category": row["category"],
        "property_type": row["property_type"],
        "images": row.get("images") or [],
        "verified": bool(row.get("verified", False)),
        "is_new": bool(row.get("is_new", True)),
        "status": row.get("status", "active"),
        "bedrooms": row.get("bedrooms"),
        "bathrooms": row.get("bathrooms"),
        "size_sqm": float(row["size_sqm"]) if row.get("size_sqm") is not None else None,
        "floor_number": row.get("floor_number"),
        "neighborhood": neighborhood_name,
        "compound_name": row.get("compound_name"),
        "views_count": row.get("views_count", 0),
        "created_at": row.get("created_at", ""),
    }


def _apply_sort(query, sort_by: str):
    """Apply sort order to a Supabase query builder."""
    if sort_by == "price_asc":
        return query.order("price", desc=False)
    elif sort_by == "price_desc":
        return query.order("price", desc=True)
    elif sort_by == "most_viewed":
        return query.order("views_count", desc=True)
    else:  # newest (default)
        return query.order("created_at", desc=True)


# ─── GET /api/listings ───────────────────────────────────────────────────────

@router.get("", response_model=ListingsPageResponse)
async def list_listings(
    category: str | None = Query(None),
    city: str | None = Query(None),
    neighborhood_id: str | None = Query(None),
    neighborhood: str | None = Query(None),
    min_price: float | None = Query(None),
    max_price: float | None = Query(None),
    min_size_sqm: float | None = Query(None),
    max_size_sqm: float | None = Query(None),
    min_bedrooms: int | None = Query(None),
    max_bedrooms: int | None = Query(None),
    min_bathrooms: int | None = Query(None),
    property_type: str | None = Query(None),
    lease_type: str | None = Query(None),
    title_deed_status: str | None = Query(None),
    room_type: str | None = Query(None),
    compound_name: str | None = Query(None),
    floor_min: int | None = Query(None),
    floor_max: int | None = Query(None),
    sort_by: str = Query("newest"),
    page: int = Query(1, ge=1),
    per_page: int = Query(12, ge=1, le=100),
):
    """
    Paginated listing search. Only returns status='active' and not soft-deleted.
    """
    offset = (page - 1) * per_page

    # Build the query — joins neighborhoods for the name field
    query = (
        supabase_admin.table("listings")
        .select("*, neighborhoods(name)", count="exact")
        .eq("status", "active")
        .is_("deleted_at", "null")
    )

    # Apply filters
    if category:
        query = query.eq("category", category)
    if city:
        query = query.ilike("city", f"%{city}%")
    if neighborhood_id:
        query = query.eq("neighborhood_id", neighborhood_id)
    if neighborhood:
        # Filter by neighborhood slug — join to neighborhoods table
        try:
            nbhd_result = (
                supabase_admin.table("neighborhoods")
                .select("id")
                .eq("slug", neighborhood)
                .single()
                .execute()
            )
            if nbhd_result.data:
                query = query.eq("neighborhood_id", nbhd_result.data["id"])
        except Exception:
            pass
    if min_price is not None:
        query = query.gte("price", min_price)
    if max_price is not None:
        query = query.lte("price", max_price)
    if min_size_sqm is not None:
        query = query.gte("size_sqm", min_size_sqm)
    if max_size_sqm is not None:
        query = query.lte("size_sqm", max_size_sqm)
    if min_bedrooms is not None:
        query = query.gte("bedrooms", min_bedrooms)
    if max_bedrooms is not None:
        query = query.lte("bedrooms", max_bedrooms)
    if min_bathrooms is not None:
        query = query.gte("bathrooms", min_bathrooms)
    if property_type:
        query = query.eq("property_type", property_type)
    if lease_type:
        query = query.eq("lease_type", lease_type)
    if title_deed_status:
        query = query.eq("title_deed_status", title_deed_status)
    if room_type:
        query = query.eq("room_type", room_type)
    if compound_name:
        query = query.ilike("compound_name", f"%{compound_name}%")
    if floor_min is not None:
        query = query.gte("floor_number", floor_min)
    if floor_max is not None:
        query = query.lte("floor_number", floor_max)

    # Sort and paginate
    query = _apply_sort(query, sort_by)
    query = query.range(offset, offset + per_page - 1)

    try:
        result = query.execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    listings = [_build_listing_brief(row) for row in (result.data or [])]
    total = result.count or 0

    return {"listings": listings, "total": total, "page": page, "per_page": per_page}


# ─── GET /api/listings/favorites ─────────────────────────────────────────────

@router.get("/favorites", response_model=list[ListingBriefResponse])
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Return all listings favorited by the current user."""
    user_id = current_user["id"]
    try:
        result = (
            supabase_admin.table("favorites")
            .select("listing_id, listings(*, neighborhoods(name))")
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    listings = []
    for row in result.data or []:
        listing_data = row.get("listings")
        if listing_data and listing_data.get("deleted_at") is None:
            listings.append(_build_listing_brief(listing_data))

    return listings


# ─── GET /api/listings/{id} ──────────────────────────────────────────────────

@router.get("/{listing_id}", response_model=ListingDetailResponse)
async def get_listing(
    listing_id: str,
    current_user: dict | None = Depends(get_optional_user),
):
    """
    Return full listing detail plus similar listings.
    Also increments view count.
    """
    try:
        result = (
            supabase_admin.table("listings")
            .select("*, neighborhoods(name)")
            .eq("id", listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not result.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = result.data

    # Only public users see active listings; owners can always see their own
    if listing.get("status") != "active":
        if not current_user or current_user["id"] != listing.get("owner_id"):
            if not current_user or current_user.get("role") != "admin":
                raise HTTPException(status_code=404, detail="Listing not found")

    # Increment views async-style (best-effort)
    try:
        supabase_admin.rpc("increment_listing_views", {"p_listing_id": listing_id}).execute()
    except Exception:
        pass

    # Fetch housemates for shared housing
    housemates: list[dict] = []
    if listing.get("category") == "shared_housing":
        try:
            hm_result = (
                supabase_admin.table("housemates")
                .select("*")
                .eq("listing_id", listing_id)
                .execute()
            )
            housemates = hm_result.data or []
        except Exception:
            pass

    # Fetch similar listings (same category + city, limit 6, exclude self)
    similar: list[dict] = []
    try:
        sim_result = (
            supabase_admin.table("listings")
            .select("*, neighborhoods(name)")
            .eq("category", listing["category"])
            .ilike("city", listing.get("city", ""))
            .eq("status", "active")
            .is_("deleted_at", "null")
            .neq("id", listing_id)
            .limit(6)
            .execute()
        )
        similar = [_build_listing_brief(r) for r in (sim_result.data or [])]
    except Exception:
        pass

    # Build the neighborhood name
    nbhd = listing.get("neighborhoods")
    neighborhood_name = nbhd.get("name") if isinstance(nbhd, dict) else None

    return {
        "id": listing["id"],
        "owner_id": listing["owner_id"],
        "agency_id": listing.get("agency_id"),
        "title": listing["title"],
        "location": listing["location"],
        "full_address": listing.get("full_address"),
        "price": float(listing["price"]),
        "currency": listing.get("currency", "EGP"),
        "price_period": listing.get("price_period"),
        "category": listing["category"],
        "property_type": listing["property_type"],
        "status": listing["status"],
        "verified": bool(listing.get("verified", False)),
        "is_new": bool(listing.get("is_new", True)),
        "images": listing.get("images") or [],
        "description": listing.get("description"),
        "bedrooms": listing.get("bedrooms"),
        "bathrooms": listing.get("bathrooms"),
        "size_sqm": float(listing["size_sqm"]) if listing.get("size_sqm") is not None else None,
        "floor_number": listing.get("floor_number"),
        "total_floors": listing.get("total_floors"),
        "neighborhood": neighborhood_name,
        "neighborhood_id": listing.get("neighborhood_id"),
        "compound_name": listing.get("compound_name"),
        "amenities": listing.get("amenities") or [],
        "latitude": float(listing["latitude"]) if listing.get("latitude") is not None else None,
        "longitude": float(listing["longitude"]) if listing.get("longitude") is not None else None,
        "views_count": listing.get("views_count", 0),
        "similar_listings": similar,
        # Rental
        "lease_type": listing.get("lease_type"),
        "min_stay_months": listing.get("min_stay_months"),
        "available_date": listing.get("available_date"),
        # Sale
        "payment_plan": listing.get("payment_plan"),
        "delivery_date": listing.get("delivery_date"),
        "title_deed_status": listing.get("title_deed_status"),
        # Shared housing
        "room_type": listing.get("room_type"),
        "lifestyle_preferences": listing.get("lifestyle_preferences"),
        "total_spots": listing.get("total_spots"),
        "filled_spots": listing.get("filled_spots"),
        "availability": listing.get("availability"),
        "furnishing": listing.get("furnishing"),
        "utilities_included": listing.get("utilities_included"),
        "bathroom_type": listing.get("bathroom_type"),
        "private_amenities": listing.get("private_amenities") or [],
        "shared_amenities": listing.get("shared_amenities") or [],
        "housemates": [
            {
                "id": h["id"],
                "name": h["name"],
                "age": h.get("age"),
                "occupation": h.get("occupation"),
                "avatar_url": h.get("avatar_url"),
                "tags": h.get("tags") or [],
            }
            for h in housemates
        ],
        "created_at": listing.get("created_at", ""),
    }


# ─── POST /api/listings ──────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_listing(
    body: CreateListingRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Create a new listing. Status is set to 'pending' awaiting admin approval."""
    listing_data = body.model_dump(exclude_none=True)
    listing_data["owner_id"] = current_user["id"]
    listing_data["status"] = "pending"
    listing_data["is_new"] = True
    listing_data["verified"] = False
    listing_data["views_count"] = 0

    try:
        result = (
            supabase_admin.table("listings")
            .insert(listing_data)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create listing: {e}")

    listing_id = result.data[0]["id"]

    # Run fraud scoring + embedding generation in the background
    background_tasks.add_task(_score_and_approve, listing_id, listing_data)
    background_tasks.add_task(asyncio.run, embed_listing(listing_id))
    background_tasks.add_task(asyncio.run, embed_listing_chunk(listing_id))

    return {"id": listing_id, "status": "pending"}


async def _score_and_approve(listing_id: str, listing_data: dict):
    """Run fraud scoring; auto-approve if score < 0.4."""
    try:
        fraud_score = await score_listing(listing_data)
        if fraud_score < 0.4:
            supabase_admin.table("listings").update(
                {"status": "active", "fraud_score": fraud_score}
            ).eq("id", listing_id).execute()

            # Notify the owner
            owner_id = listing_data.get("owner_id")
            if owner_id:
                supabase_admin.table("notifications").insert({
                    "user_id": owner_id,
                    "type": "listing_approved",
                    "title": "Listing Approved",
                    "body": f"Your listing \"{listing_data.get('title', '')}\" has been auto-approved.",
                    "metadata": {"listing_id": listing_id},
                }).execute()
        else:
            # Store the score but keep pending for manual review
            supabase_admin.table("listings").update(
                {"fraud_score": fraud_score}
            ).eq("id", listing_id).execute()
    except Exception:
        pass  # Best-effort — listing stays pending


# ─── PUT /api/listings/{id} ──────────────────────────────────────────────────

@router.put("/{listing_id}")
async def update_listing(
    listing_id: str,
    body: UpdateListingRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Update a listing. Only the owner can update."""
    # Verify ownership
    try:
        check = (
            supabase_admin.table("listings")
            .select("owner_id")
            .eq("id", listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not check.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    if check.data["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not the listing owner")

    update_data = body.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    try:
        result = (
            supabase_admin.table("listings")
            .update(update_data)
            .eq("id", listing_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update listing: {e}")

    # Re-embed the listing chunk so RAG reflects the latest content
    background_tasks.add_task(asyncio.run, embed_listing_chunk(listing_id))

    return result.data[0] if result.data else {}


# ─── DELETE /api/listings/{id} ───────────────────────────────────────────────

@router.delete("/{listing_id}", status_code=204)
async def delete_listing(
    listing_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Soft-delete a listing (owner only). Sets deleted_at = now()."""
    try:
        check = (
            supabase_admin.table("listings")
            .select("owner_id")
            .eq("id", listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not check.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    if check.data["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not the listing owner")

    now = datetime.now(timezone.utc).isoformat()
    try:
        supabase_admin.table("listings").update({"deleted_at": now}).eq("id", listing_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete listing: {e}")

    # Remove from knowledge_chunks so it no longer surfaces in RAG results
    background_tasks.add_task(asyncio.run, delete_listing_chunk(listing_id))


# ─── POST /api/listings/{id}/favorite ────────────────────────────────────────

@router.post("/{listing_id}/favorite")
async def toggle_favorite(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Toggle favorite on a listing. Returns {favorited: bool}."""
    user_id = current_user["id"]
    try:
        result = supabase_admin.rpc(
            "toggle_favorite",
            {"p_user_id": user_id, "p_listing_id": listing_id},
        ).execute()
        favorited = bool(result.data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to toggle favorite: {e}")

    return {"favorited": favorited, "listing_id": listing_id}


# ─── POST /api/listings/{id}/apply ───────────────────────────────────────────

@router.post("/{listing_id}/apply")
async def apply_to_listing(
    listing_id: str,
    body: ApplyRequest,
    current_user: dict = Depends(get_current_user),
):
    """Apply to a shared housing listing."""
    user_id = current_user["id"]

    # Verify listing exists, is shared_housing and active
    try:
        listing_check = (
            supabase_admin.table("listings")
            .select("id, category, status, owner_id")
            .eq("id", listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not listing_check.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_check.data
    if listing.get("category") != "shared_housing":
        raise HTTPException(status_code=400, detail="This listing is not shared housing")
    if listing.get("status") != "active":
        raise HTTPException(status_code=400, detail="Listing is not active")
    if listing.get("owner_id") == user_id:
        raise HTTPException(status_code=400, detail="Cannot apply to your own listing")

    # Check for duplicate application
    try:
        existing = (
            supabase_admin.table("listing_applications")
            .select("id, status")
            .eq("listing_id", listing_id)
            .eq("applicant_id", user_id)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="Already applied to this listing")
    except HTTPException:
        raise
    except Exception:
        pass

    # Calculate a basic compatibility score (0-100)
    # Full AI scoring can be done in the ai/compatibility endpoint
    compatibility_score = None

    application_data = {
        "listing_id": listing_id,
        "applicant_id": user_id,
        "status": "pending",
    }
    if body.message:
        application_data["message"] = body.message
    if body.lifestyle_data:
        application_data["lifestyle_data"] = body.lifestyle_data
    if compatibility_score is not None:
        application_data["compatibility_score"] = compatibility_score

    try:
        result = (
            supabase_admin.table("listing_applications")
            .insert(application_data)
            .select("id, status, compatibility_score")
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit application: {e}")

    # Notify the listing owner
    try:
        supabase_admin.table("notifications").insert({
            "user_id": listing["owner_id"],
            "type": "application_received",
            "title": "New Application",
            "body": f"{current_user.get('full_name', 'Someone')} applied to your listing",
            "metadata": {"listing_id": listing_id, "application_id": result.data["id"]},
        }).execute()
    except Exception:
        pass

    return {
        "id": result.data["id"],
        "compatibility_score": result.data.get("compatibility_score"),
        "status": result.data["status"],
    }


# ─── GET /api/listings/{id}/applications ─────────────────────────────────────

@router.get("/{listing_id}/applications", response_model=list[ApplicationDetailResponse])
async def get_applications(
    listing_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all applications for a listing. Owner only."""
    # Verify ownership
    try:
        check = (
            supabase_admin.table("listings")
            .select("owner_id")
            .eq("id", listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not check.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    if check.data["owner_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not the listing owner")

    try:
        result = (
            supabase_admin.table("listing_applications")
            .select("*, profiles(full_name, avatar_url)")
            .eq("listing_id", listing_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    applications = []
    for row in result.data or []:
        profile = row.get("profiles") or {}
        applications.append({
            "id": row["id"],
            "listing_id": row["listing_id"],
            "applicant_id": row["applicant_id"],
            "applicant_name": profile.get("full_name"),
            "applicant_avatar": profile.get("avatar_url"),
            "compatibility_score": row.get("compatibility_score"),
            "status": row["status"],
            "message": row.get("message"),
            "created_at": row.get("created_at", ""),
        })

    return applications


# Note: PUT /api/applications/{id} is handled by app/applications/router.py
# registered in main.py as /api/applications — not nested here under /api/listings.
