import logging

from fastapi import APIRouter, HTTPException, Depends
from app.viewings.schemas import CreateViewingRequest, UpdateViewingRequest
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", status_code=201)
async def create_viewing(
    body: CreateViewingRequest,
    current_user: dict = Depends(get_current_user),
):
    """Request a property viewing."""
    user_id = current_user["id"]

    # Fetch listing to get owner_id and verify it's active
    try:
        listing_result = (
            supabase_admin.table("listings")
            .select("id, owner_id, title, status")
            .eq("id", body.listing_id)
            .is_("deleted_at", "null")
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Listing not found")

    if not listing_result.data:
        raise HTTPException(status_code=404, detail="Listing not found")

    listing = listing_result.data

    if listing.get("status") != "active":
        raise HTTPException(status_code=400, detail="Listing is not active")

    if listing["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot request a viewing of your own listing")

    viewing_data = {
        "listing_id": body.listing_id,
        "requester_id": user_id,
        "owner_id": listing["owner_id"],
        "scheduled_at": body.scheduled_at,
        "status": "pending",
    }
    if body.notes:
        viewing_data["notes"] = body.notes

    try:
        result = (
            supabase_admin.table("viewings")
            .insert(viewing_data)
            .select("*")
            .single()
            .execute()
        )
    except Exception as e:
        logger.error("create_viewing failed for listing %s: %s", body.listing_id, e)
        raise HTTPException(status_code=500, detail="Internal server error")

    # Notify the listing owner
    try:
        supabase_admin.table("notifications").insert({
            "user_id": listing["owner_id"],
            "type": "application_received",  # reuse type for viewing request
            "title": "Viewing Request",
            "body": f"{current_user.get('full_name', 'Someone')} requested a viewing for '{listing['title']}'",
            "metadata": {"viewing_id": result.data["id"], "listing_id": body.listing_id},
        }).execute()
    except Exception:
        pass

    return result.data


@router.put("/{viewing_id}")
async def update_viewing(
    viewing_id: str,
    body: UpdateViewingRequest,
    current_user: dict = Depends(get_current_user),
):
    """Confirm or cancel a viewing. Only the listing owner can update the status."""
    if body.status not in ("confirmed", "cancelled"):
        raise HTTPException(status_code=400, detail="status must be 'confirmed' or 'cancelled'")

    user_id = current_user["id"]

    try:
        viewing_result = (
            supabase_admin.table("viewings")
            .select("*")
            .eq("id", viewing_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Viewing not found")

    if not viewing_result.data:
        raise HTTPException(status_code=404, detail="Viewing not found")

    viewing = viewing_result.data

    # Either the owner or the requester can cancel; only owner can confirm
    if body.status == "confirmed" and viewing["owner_id"] != user_id:
        raise HTTPException(status_code=403, detail="Only the listing owner can confirm viewings")
    if body.status == "cancelled" and viewing["owner_id"] != user_id and viewing["requester_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this viewing")

    try:
        result = (
            supabase_admin.table("viewings")
            .update({"status": body.status})
            .eq("id", viewing_id)
            .execute()
        )
    except Exception as e:
        logger.error("update_viewing failed for viewing %s: %s", viewing_id, e)
        raise HTTPException(status_code=500, detail="Internal server error")

    # Notify the requester on confirmation
    if body.status == "confirmed":
        try:
            supabase_admin.table("notifications").insert({
                "user_id": viewing["requester_id"],
                "type": "viewing_confirmed",
                "title": "Viewing Confirmed",
                "body": "Your viewing request has been confirmed!",
                "metadata": {"viewing_id": viewing_id},
            }).execute()
        except Exception:
            pass

    return result.data[0] if result.data else {}
