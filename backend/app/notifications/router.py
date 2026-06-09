import logging

from fastapi import APIRouter, HTTPException, Depends
from app.database import supabase_admin
from app.dependencies import get_current_user

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("")
async def list_notifications(current_user: dict = Depends(get_current_user)):
    """Return all notifications for the current user, newest first."""
    user_id = current_user["id"]
    try:
        result = (
            supabase_admin.table("notifications")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .execute()
        )
    except Exception as e:
        logger.error("list_notifications failed for user %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Internal server error")

    return result.data or []


# IMPORTANT: This must be declared BEFORE /{notification_id}/read
# to prevent FastAPI from matching "read-all" as a notification_id.
@router.put("/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all of the current user's notifications as read."""
    user_id = current_user["id"]
    try:
        supabase_admin.table("notifications").update({"is_read": True}).eq(
            "user_id", user_id
        ).eq("is_read", False).execute()
    except Exception as e:
        logger.error("mark_all_notifications_read failed for user %s: %s", user_id, e)
        raise HTTPException(status_code=500, detail="Internal server error")

    return {"message": "All notifications marked as read"}


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Mark a single notification as read."""
    user_id = current_user["id"]
    try:
        result = (
            supabase_admin.table("notifications")
            .update({"is_read": True})
            .eq("id", notification_id)
            .eq("user_id", user_id)
            .execute()
        )
    except Exception as e:
        logger.error("mark_notification_read failed for notification %s: %s", notification_id, e)
        raise HTTPException(status_code=500, detail="Internal server error")

    if not result.data:
        raise HTTPException(status_code=404, detail="Notification not found")

    return result.data[0]
