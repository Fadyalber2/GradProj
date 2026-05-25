import json
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from pydantic import BaseModel, Field

from app.ai.ollama_client import ollama
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()


class CreateApplicationRequest(BaseModel):
    listing_id: str
    message: str = ""
    lifestyle_data: dict[str, Any] = Field(default_factory=dict)


class UpdateApplicationRequest(BaseModel):
    status: str  # "approved" | "rejected"


def _first_image(listing: dict) -> str | None:
    images = listing.get("images") or []
    return images[0] if images else None


async def _score_application_compatibility(
    application_id: str,
    listing_id: str,
    lifestyle_data: dict[str, Any],
):
    """Best-effort AI compatibility scoring. Application remains valid if Ollama fails."""
    try:
        listing = (
            supabase_admin.table("listings")
            .select("title, lifestyle_preferences")
            .eq("id", listing_id)
            .single()
            .execute()
        ).data or {}
        housemates = (
            supabase_admin.table("housemates")
            .select("name, age, occupation, tags, user_id")
            .eq("listing_id", listing_id)
            .execute()
        ).data or []

        if not await ollama.health():
            return

        system = (
            "You score roommate compatibility for an Egyptian shared housing listing. "
            "Consider gender preference, smoking, pets, guests, noise, cleanliness, "
            "sleep schedule, occupation, and current housemates. "
            "Return ONLY JSON: {\"score\": <0-100>, \"reasons\": [\"short reason\"]}."
        )
        prompt = json.dumps(
            {
                "listing_title": listing.get("title"),
                "listing_preferences": listing.get("lifestyle_preferences") or {},
                "applicant_preferences": lifestyle_data or {},
                "housemates": housemates,
            }
        )
        raw = await ollama.generate(prompt=prompt, system=system)
        start = raw.find("{")
        end = raw.rfind("}") + 1
        parsed = json.loads(raw[start:end]) if start >= 0 and end > start else {}
        score = max(0, min(100, int(parsed.get("score", 50))))
        reasons = parsed.get("reasons", [])
        if not isinstance(reasons, list):
            reasons = []

        (
            supabase_admin.table("listing_applications")
            .update({"compatibility_score": score, "compatibility_reasons": reasons})
            .eq("id", application_id)
            .execute()
        )
    except Exception:
        # Keep the user flow resilient. Null score means pending/manual compatibility.
        try:
            (
                supabase_admin.table("listing_applications")
                .update({"compatibility_score": None})
                .eq("id", application_id)
                .execute()
            )
        except Exception:
            pass


@router.post("", status_code=201)
async def create_application(
    body: CreateApplicationRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """Apply to a shared housing listing."""
    user_id = current_user["id"]

    try:
        listing_result = (
            supabase_admin.table("listings")
            .select("id, owner_id, title, category, status, total_spots, filled_spots")
            .eq("id", body.listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_result.data
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    if listing.get("status") != "active":
        raise HTTPException(status_code=400, detail="Listing is not active")
    if listing.get("category") != "shared_housing":
        raise HTTPException(status_code=400, detail="Only shared housing listings accept applications")
    if listing["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot apply to your own listing")

    total_spots = listing.get("total_spots")
    filled_spots = listing.get("filled_spots") or 0
    if total_spots is not None and filled_spots >= total_spots:
        raise HTTPException(status_code=400, detail="No spots available")

    try:
        existing = (
            supabase_admin.table("listing_applications")
            .select("id")
            .eq("listing_id", body.listing_id)
            .eq("applicant_id", user_id)
            .limit(1)
            .execute()
        )
        if existing.data:
            raise HTTPException(status_code=409, detail="You already applied to this listing")
    except HTTPException:
        raise
    except Exception:
        pass

    application_data = {
        "listing_id": body.listing_id,
        "applicant_id": user_id,
        "message": body.message,
        "lifestyle_data": body.lifestyle_data,
        "status": "pending",
    }

    try:
        result = supabase_admin.table("listing_applications").insert(application_data).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create application: {e}")

    application = (result.data or [None])[0]
    if not application:
        raise HTTPException(status_code=500, detail="Failed to create application: no row returned")

    background_tasks.add_task(
        _score_application_compatibility,
        application["id"],
        body.listing_id,
        body.lifestyle_data,
    )

    try:
        supabase_admin.table("notifications").insert({
            "user_id": listing["owner_id"],
            "type": "application_received",
            "title": "New Application",
            "body": f"{current_user.get('full_name', 'Someone')} applied to your listing '{listing['title']}'",
            "metadata": {"application_id": application["id"], "listing_id": body.listing_id},
        }).execute()
    except Exception:
        pass

    return application


@router.get("/my")
async def get_my_applications(current_user: dict = Depends(get_current_user)):
    """Return applications submitted by the current user."""
    user_id = current_user["id"]
    try:
        result = (
            supabase_admin.table("listing_applications")
            .select("id, listing_id, status, compatibility_score, created_at, listings(title, images, location)")
            .eq("applicant_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as e:
        # Keep dashboard history usable if the applications table/columns are not migrated.
        return []

    rows = []
    for row in result.data or []:
        listing = row.get("listings") or {}
        rows.append({
            "id": row["id"],
            "listing_id": row["listing_id"],
            "listing_title": listing.get("title"),
            "listing_image": _first_image(listing),
            "listing_location": listing.get("location") or "",
            "status": row["status"],
            "compatibility_score": row.get("compatibility_score"),
            "created_at": row.get("created_at", ""),
        })
    return rows


@router.put("/{application_id}")
async def update_application(
    application_id: str,
    body: UpdateApplicationRequest,
    current_user: dict = Depends(get_current_user),
):
    """Approve or reject a shared housing application. Only the listing owner can do this."""
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")

    user_id = current_user["id"]
    try:
        app_result = (
            supabase_admin.table("listing_applications")
            .select("*, listings(owner_id, title, total_spots, filled_spots)")
            .eq("id", application_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

    app = app_result.data
    if not app:
        raise HTTPException(status_code=404, detail="Application not found")

    listing_data = app.get("listings") or {}
    if listing_data.get("owner_id") != user_id:
        raise HTTPException(status_code=403, detail="Not the listing owner")

    try:
        result = (
            supabase_admin.table("listing_applications")
            .update({"status": body.status})
            .eq("id", application_id)
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update application: {e}")

    if body.status == "approved":
        total_spots = listing_data.get("total_spots")
        filled_spots = listing_data.get("filled_spots") or 0
        if total_spots is None or filled_spots < total_spots:
            try:
                (
                    supabase_admin.table("listings")
                    .update({"filled_spots": filled_spots + 1})
                    .eq("id", app["listing_id"])
                    .execute()
                )
            except Exception:
                pass

    notif_type = "application_approved" if body.status == "approved" else "application_rejected"
    notif_title = "Application Approved" if body.status == "approved" else "Application Rejected"
    notif_body = (
        "Your application has been approved. Get in touch with the listing owner."
        if body.status == "approved"
        else "Your application was not approved at this time."
    )
    try:
        supabase_admin.table("notifications").insert({
            "user_id": app["applicant_id"],
            "type": notif_type,
            "title": notif_title,
            "body": notif_body,
            "metadata": {
                "application_id": application_id,
                "listing_id": app["listing_id"],
                "listing_title": listing_data.get("title"),
            },
        }).execute()
    except Exception:
        pass

    return result.data[0] if result.data else {}
