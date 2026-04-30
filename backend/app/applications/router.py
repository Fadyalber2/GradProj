from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()


class CreateApplicationRequest(BaseModel):
    listing_id: str
    message: str = ""


class UpdateApplicationRequest(BaseModel):
    status: str  # "approved" | "rejected"


@router.post("", status_code=201)
async def create_application(
    body: CreateApplicationRequest,
    current_user: dict = Depends(get_current_user),
):
    """Apply to a shared housing listing."""
    user_id = current_user["id"]

    # Verify listing exists, is active, and is shared_housing
    try:
        listing_result = (
            supabase_admin.table("listings")
            .select("id, owner_id, title, category, status")
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

    if listing.get("category") != "shared_housing":
        raise HTTPException(status_code=400, detail="Only shared housing listings accept applications")

    if listing["owner_id"] == user_id:
        raise HTTPException(status_code=400, detail="Cannot apply to your own listing")

    # Check for duplicate application
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
        "status": "pending",
    }

    try:
        result = (
            supabase_admin.table("listing_applications")
            .insert(application_data)
            .select("*")
            .single()
            .execute()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create application: {e}")

    # Notify listing owner
    try:
        supabase_admin.table("notifications").insert({
            "user_id": listing["owner_id"],
            "type": "application_received",
            "title": "New Application",
            "body": f"{current_user.get('full_name', 'Someone')} applied to your listing '{listing['title']}'",
            "metadata": {"application_id": result.data["id"], "listing_id": body.listing_id},
        }).execute()
    except Exception:
        pass

    return result.data


@router.put("/{application_id}")
async def update_application(
    application_id: str,
    body: UpdateApplicationRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Approve or reject a shared housing application.
    Only the listing owner can perform this action.
    """
    if body.status not in ("approved", "rejected"):
        raise HTTPException(status_code=400, detail="status must be 'approved' or 'rejected'")

    user_id = current_user["id"]

    # Fetch the application and verify ownership via the listing
    try:
        app_result = (
            supabase_admin.table("listing_applications")
            .select("*, listings(owner_id, title)")
            .eq("id", application_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Application not found")

    if not app_result.data:
        raise HTTPException(status_code=404, detail="Application not found")

    app = app_result.data
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

    # Notify the applicant
    notif_type = "application_approved" if body.status == "approved" else "application_rejected"
    notif_title = "Application Approved" if body.status == "approved" else "Application Rejected"
    notif_body = (
        "Your application has been approved! Get in touch with the listing owner."
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

    # If approved, optionally update filled_spots count on the listing
    if body.status == "approved":
        try:
            supabase_admin.rpc(
                "increment_listing_views",  # reuse or create a dedicated function later
                {},
            )
        except Exception:
            pass

    return result.data[0] if result.data else {}
