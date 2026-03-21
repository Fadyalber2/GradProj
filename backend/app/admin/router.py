import math
import secrets
import time
import jwt
from fastapi import APIRouter, HTTPException, Depends, Query, Request, Body
from app.admin.schemas import (
    AdminLoginRequest, AdminLoginResponse,
    RejectListingRequest, VerifyUserRequest,
)
from app.database import supabase_admin
from app.config import settings

router = APIRouter()

ADMIN_TOKEN_EXPIRY = 24 * 60 * 60  # 24 hours


def _create_admin_token(username: str) -> str:
    """Create a signed JWT for admin sessions."""
    payload = {
        "sub": username,
        "role": "admin",
        "iat": int(time.time()),
        "exp": int(time.time()) + ADMIN_TOKEN_EXPIRY,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def _verify_admin_token(token: str) -> str:
    """Verify an admin JWT and return the username."""
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Admin token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid admin token")
    if payload.get("role") != "admin":
        raise HTTPException(status_code=401, detail="Not an admin token")
    return payload["sub"]


def get_admin(request: Request) -> str:
    """Authenticate admin via Bearer token (frontend) or Basic Auth (API tools)."""
    auth = request.headers.get("Authorization", "")

    # Bearer token (from frontend admin login)
    if auth.startswith("Bearer "):
        return _verify_admin_token(auth[7:])

    # Basic Auth fallback (for curl / API tools)
    if auth.startswith("Basic "):
        import base64
        try:
            decoded = base64.b64decode(auth[6:]).decode("utf-8")
            username, password = decoded.split(":", 1)
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid Basic auth header")
        ok_user = secrets.compare_digest(username, settings.admin_username)
        ok_pass = secrets.compare_digest(password, settings.admin_password)
        if not (ok_user and ok_pass):
            raise HTTPException(status_code=401, detail="Invalid admin credentials")
        return username

    raise HTTPException(status_code=401, detail="Missing Authorization header")


def _paged(data: list, total: int, page: int, per_page: int) -> dict:
    """Build a standardized paginated response for the admin frontend."""
    return {
        "data": data,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": max(1, math.ceil(total / per_page)),
    }


def _count(table: str) -> int:
    """Quick row count for a table."""
    try:
        r = supabase_admin.table(table).select("id", count="exact").limit(0).execute()
        return r.count or 0
    except Exception:
        return 0


# ─── Auth ─────────────────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=AdminLoginResponse)
async def admin_login(body: AdminLoginRequest):
    """Validate admin credentials and return a signed JWT."""
    ok_user = secrets.compare_digest(body.username, settings.admin_username)
    ok_pass = secrets.compare_digest(body.password, settings.admin_password)
    if not (ok_user and ok_pass):
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    return AdminLoginResponse(token=_create_admin_token(body.username))


# ─── Stats ────────────────────────────────────────────────────────────────────

@router.get("/stats")
async def admin_stats(_admin: str = Depends(get_admin)):
    """Platform-wide statistics for the admin dashboard."""
    total_users = _count("profiles")
    total_agencies = _count("agencies")
    total_projects = _count("projects")

    # Listings counts by status
    try:
        all_listings = (
            supabase_admin.table("listings")
            .select("status", count="exact")
            .is_("deleted_at", "null")
            .execute()
        )
        total_listings = all_listings.count or 0
    except Exception:
        total_listings = 0

    active_listings = pending_listings = 0
    try:
        r = supabase_admin.table("listings").select("id", count="exact").eq("status", "active").is_("deleted_at", "null").execute()
        active_listings = r.count or 0
    except Exception:
        pass
    try:
        r = supabase_admin.table("listings").select("id", count="exact").eq("status", "pending").is_("deleted_at", "null").execute()
        pending_listings = r.count or 0
    except Exception:
        pass

    # Shared housing count
    try:
        r = supabase_admin.table("listings").select("id", count="exact").eq("category", "shared_housing").eq("status", "active").is_("deleted_at", "null").execute()
        total_shared_housing = r.count or 0
    except Exception:
        total_shared_housing = 0

    # Fraud-flagged listings
    try:
        r = supabase_admin.table("listings").select("id", count="exact").gt("fraud_score", 0.5).is_("deleted_at", "null").execute()
        flagged_listings = r.count or 0
    except Exception:
        flagged_listings = 0

    # Blog posts
    total_blog_posts = _count("blog_posts")

    # Transactions (stub — no payments table yet)
    total_transactions = 0

    # Verified sellers
    try:
        r = supabase_admin.table("profiles").select("id", count="exact").eq("is_verified_seller", True).execute()
        total_verified_sellers = r.count or 0
    except Exception:
        total_verified_sellers = 0

    return {
        "total_users": total_users,
        "total_listings": total_listings,
        "total_agencies": total_agencies,
        "total_projects": total_projects,
        "total_shared_housing": total_shared_housing,
        "total_blog_posts": total_blog_posts,
        "total_transactions": total_transactions,
        "flagged_listings": flagged_listings,
        "pending_listings": pending_listings,
        "active_listings": active_listings,
        "total_verified_sellers": total_verified_sellers,
    }


# ─── Listings ─────────────────────────────────────────────────────────────────

@router.get("/listings")
async def admin_list_listings(
    status: str | None = Query(None),
    search: str | None = Query(None),
    property_type: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """Return listings (paginated, filterable)."""
    offset = (page - 1) * per_page
    query = (
        supabase_admin.table("listings")
        .select("*, profiles!listings_owner_id_fkey(full_name, email, avatar_url), neighborhoods(name)", count="exact")
        .is_("deleted_at", "null")
    )
    if status:
        query = query.eq("status", status)
    if property_type:
        query = query.eq("property_type", property_type)
    if search:
        query = query.ilike("title", f"%{search}%")

    try:
        result = query.order("created_at", desc=False).range(offset, offset + per_page - 1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


@router.post("/listings", status_code=201)
async def admin_create_listing(
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-create a listing (bypasses normal flow)."""
    body.setdefault("status", "active")
    try:
        result = supabase_admin.table("listings").insert(body).select("*").single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create listing: {e}")
    return result.data


@router.put("/listings/{listing_id}")
async def admin_update_listing(
    listing_id: str,
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-update any listing field."""
    body.pop("id", None)
    body.pop("owner_id", None)
    try:
        result = (
            supabase_admin.table("listings")
            .update(body)
            .eq("id", listing_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update listing: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    return result.data[0]


@router.delete("/listings/{listing_id}")
async def admin_delete_listing(
    listing_id: str,
    _admin: str = Depends(get_admin),
):
    """Soft-delete a listing and notify the owner."""
    from datetime import datetime, timezone
    # Fetch owner info before deleting so we can notify them
    try:
        listing_result = (
            supabase_admin.table("listings")
            .select("id, owner_id, title")
            .eq("id", listing_id)
            .single()
            .execute()
        )
    except Exception:
        listing_result = None

    try:
        supabase_admin.table("listings").update(
            {"deleted_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", listing_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete listing: {e}")

    # Notify owner
    if listing_result and listing_result.data:
        listing = listing_result.data
        try:
            supabase_admin.table("notifications").insert({
                "user_id": listing["owner_id"],
                "type": "listing_removed",
                "title": "Listing Removed",
                "body": f"Your listing \"{listing['title']}\" has been removed by an administrator.",
                "metadata": {"listing_id": listing_id},
            }).execute()
        except Exception:
            pass

    return {"message": "Listing deleted"}


@router.put("/listings/{listing_id}/approve")
async def admin_approve_listing(
    listing_id: str,
    _admin: str = Depends(get_admin),
):
    """Approve a listing: set status='active'."""
    try:
        listing_result = (
            supabase_admin.table("listings")
            .select("id, owner_id, title, status")
            .eq("id", listing_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not listing_result.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_result.data

    if listing["status"] == "active":
        raise HTTPException(status_code=400, detail="Listing is already active")

    try:
        result = (
            supabase_admin.table("listings")
            .update({"status": "active"})
            .eq("id", listing_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to approve listing: {e}")

    try:
        supabase_admin.table("notifications").insert({
            "user_id": listing["owner_id"],
            "type": "listing_approved",
            "title": "Listing Approved",
            "body": f"Your listing '{listing['title']}' has been approved and is now live!",
            "metadata": {"listing_id": listing_id},
        }).execute()
    except Exception:
        pass

    return {"message": "Listing approved", "listing": result.data[0] if result.data else {}}


@router.put("/listings/{listing_id}/reject")
async def admin_reject_listing(
    listing_id: str,
    body: RejectListingRequest,
    _admin: str = Depends(get_admin),
):
    """Reject a listing with a reason."""
    try:
        listing_result = (
            supabase_admin.table("listings")
            .select("id, owner_id, title, status")
            .eq("id", listing_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not listing_result.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_result.data

    try:
        result = (
            supabase_admin.table("listings")
            .update({"status": "rejected"})
            .eq("id", listing_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reject listing: {e}")

    try:
        supabase_admin.table("notifications").insert({
            "user_id": listing["owner_id"],
            "type": "listing_rejected",
            "title": "Listing Rejected",
            "body": f"Your listing '{listing['title']}' was not approved. Reason: {body.reason}",
            "metadata": {"listing_id": listing_id, "reason": body.reason},
        }).execute()
    except Exception:
        pass

    return {"message": "Listing rejected", "reason": body.reason, "listing": result.data[0] if result.data else {}}


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("/users")
async def admin_list_users(
    search: str | None = Query(None),
    role: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """Return all user profiles (paginated)."""
    offset = (page - 1) * per_page
    query = supabase_admin.table("profiles").select("*", count="exact")
    if search:
        query = query.ilike("full_name", f"%{search}%")
    if role:
        query = query.eq("role", role)

    try:
        result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


@router.put("/users/{user_id}/verify")
async def admin_verify_user(
    user_id: str,
    body: VerifyUserRequest,
    _admin: str = Depends(get_admin),
):
    """Grant or revoke the is_verified_seller badge for a user."""
    try:
        result = (
            supabase_admin.table("profiles")
            .update({"is_verified_seller": body.is_verified_seller})
            .eq("id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")

    action = "granted" if body.is_verified_seller else "revoked"
    return {
        "message": f"Verified seller badge {action}",
        "user": result.data[0],
    }


@router.put("/users/{user_id}")
async def admin_update_user(
    user_id: str,
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Update any user profile field."""
    body.pop("id", None)
    allowed = {"full_name", "phone", "role", "bio", "is_verified_seller"}
    update_data = {k: v for k, v in body.items() if k in allowed}
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    try:
        result = (
            supabase_admin.table("profiles")
            .update(update_data)
            .eq("id", user_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="User not found")
    return result.data[0]


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    _admin: str = Depends(get_admin),
):
    """Delete a user profile (does not remove Supabase auth user)."""
    try:
        supabase_admin.table("profiles").delete().eq("id", user_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    return {"message": "User profile deleted"}


# ─── Agencies ─────────────────────────────────────────────────────────────────

@router.get("/agencies")
async def admin_list_agencies(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """List all agencies (admin)."""
    offset = (page - 1) * per_page
    query = supabase_admin.table("agencies").select("*", count="exact")
    if search:
        query = query.ilike("name", f"%{search}%")

    try:
        result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


@router.post("/agencies", status_code=201)
async def admin_create_agency(
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-create an agency."""
    body.setdefault("subscription_plan", "none")
    body.setdefault("listing_quota", 0)
    try:
        result = supabase_admin.table("agencies").insert(body).select("*").single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create agency: {e}")
    return result.data


@router.put("/agencies/{agency_id}")
async def admin_update_agency(
    agency_id: str,
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-update an agency."""
    body.pop("id", None)
    try:
        result = (
            supabase_admin.table("agencies")
            .update(body)
            .eq("id", agency_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update agency: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Agency not found")
    return result.data[0]


@router.delete("/agencies/{agency_id}")
async def admin_delete_agency(
    agency_id: str,
    _admin: str = Depends(get_admin),
):
    """Delete an agency."""
    try:
        supabase_admin.table("agencies").delete().eq("id", agency_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete agency: {e}")
    return {"message": "Agency deleted"}


# ─── Projects ─────────────────────────────────────────────────────────────────

@router.get("/projects")
async def admin_list_projects(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """List all projects (admin)."""
    offset = (page - 1) * per_page
    query = supabase_admin.table("projects").select("*", count="exact")
    if search:
        query = query.ilike("title", f"%{search}%")

    try:
        result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


@router.post("/projects", status_code=201)
async def admin_create_project(
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-create a project."""
    try:
        result = supabase_admin.table("projects").insert(body).select("*").single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create project: {e}")
    return result.data


@router.put("/projects/{project_id}")
async def admin_update_project(
    project_id: str,
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-update a project."""
    body.pop("id", None)
    try:
        result = (
            supabase_admin.table("projects")
            .update(body)
            .eq("id", project_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update project: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")
    return result.data[0]


@router.delete("/projects/{project_id}")
async def admin_delete_project(
    project_id: str,
    _admin: str = Depends(get_admin),
):
    """Delete a project."""
    try:
        supabase_admin.table("projects").delete().eq("id", project_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {e}")
    return {"message": "Project deleted"}


# ─── Blog ─────────────────────────────────────────────────────────────────────

@router.get("/blog")
async def admin_list_blog(
    search: str | None = Query(None),
    is_published: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """List all blog posts (admin, includes unpublished)."""
    offset = (page - 1) * per_page
    query = supabase_admin.table("blog_posts").select("*", count="exact")
    if search:
        query = query.ilike("title", f"%{search}%")
    if is_published == "true":
        query = query.eq("is_published", True)
    elif is_published == "false":
        query = query.eq("is_published", False)

    try:
        result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


@router.post("/blog", status_code=201)
async def admin_create_blog_post(
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-create a blog post."""
    # Generate slug from title if not provided
    if "slug" not in body and "title" in body:
        import re
        body["slug"] = re.sub(r"[^a-z0-9]+", "-", body["title"].lower()).strip("-")
    body.setdefault("content", [])
    body.setdefault("tags", [])
    body.setdefault("is_published", False)

    try:
        result = supabase_admin.table("blog_posts").insert(body).select("*").single().execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create blog post: {e}")
    return result.data


@router.put("/blog/{post_id}")
async def admin_update_blog_post(
    post_id: str,
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Admin-update a blog post."""
    body.pop("id", None)
    try:
        result = (
            supabase_admin.table("blog_posts")
            .update(body)
            .eq("id", post_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update blog post: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return result.data[0]


@router.delete("/blog/{post_id}")
async def admin_delete_blog_post(
    post_id: str,
    _admin: str = Depends(get_admin),
):
    """Delete a blog post."""
    try:
        supabase_admin.table("blog_posts").delete().eq("id", post_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete blog post: {e}")
    return {"message": "Blog post deleted"}


# ─── Shared Housing ──────────────────────────────────────────────────────────

@router.get("/shared-housing")
async def admin_list_shared_housing(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """List shared housing listings (category=shared_housing)."""
    offset = (page - 1) * per_page
    query = (
        supabase_admin.table("listings")
        .select("*", count="exact")
        .eq("category", "shared_housing")
        .is_("deleted_at", "null")
    )
    if search:
        query = query.ilike("title", f"%{search}%")

    try:
        result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


# ─── Fraud ────────────────────────────────────────────────────────────────────

@router.get("/fraud")
async def admin_list_fraud(
    page: int = Query(1, ge=1),
    per_page: int = Query(15, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """List fraud-flagged listings (fraud_score > 0.5)."""
    offset = (page - 1) * per_page
    try:
        result = (
            supabase_admin.table("listings")
            .select("*", count="exact")
            .gt("fraud_score", 0.5)
            .is_("deleted_at", "null")
            .order("fraud_score", desc=True)
            .range(offset, offset + per_page - 1)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


@router.put("/fraud/{listing_id}")
async def admin_review_fraud(
    listing_id: str,
    body: dict = Body(...),
    _admin: str = Depends(get_admin),
):
    """Approve or reject a fraud-flagged listing."""
    action = body.get("action")
    if action not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="action must be 'approve' or 'reject'")

    new_status = "active" if action == "approve" else "rejected"
    try:
        result = (
            supabase_admin.table("listings")
            .update({"status": new_status, "fraud_score": 0})
            .eq("id", listing_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to review listing: {e}")
    if not result.data:
        raise HTTPException(status_code=404, detail="Listing not found")
    return {"message": f"Listing {action}d", "listing": result.data[0]}


# ─── Notifications (read-only admin view) ────────────────────────────────────

@router.get("/notifications")
async def admin_list_notifications(
    search: str | None = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """List all notifications (admin, read-only)."""
    offset = (page - 1) * per_page
    query = supabase_admin.table("notifications").select("*", count="exact")
    if search:
        query = query.ilike("title", f"%{search}%")

    try:
        result = query.order("created_at", desc=True).range(offset, offset + per_page - 1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {e}")

    return _paged(result.data or [], result.count or 0, page, per_page)


# ─── Transactions (stub — no payments table yet) ─────────────────────────────

@router.get("/transactions")
async def admin_list_transactions(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    _admin: str = Depends(get_admin),
):
    """Stub: no payments table yet. Returns empty list."""
    return _paged([], 0, page, per_page)
