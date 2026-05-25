import asyncio
from datetime import date, timedelta

from app.database import supabase_admin


async def complete_expired_leases_once():
    today = date.today().isoformat()
    try:
        result = (
            supabase_admin.table("bookings")
            .select("id, renter_id, owner_id, listing_id")
            .eq("status", "active")
            .lte("end_date", today)
            .execute()
        )
    except Exception:
        return

    for booking in result.data or []:
        try:
            (
                supabase_admin.table("bookings")
                .update({"status": "completed", "vacated_by": "auto"})
                .eq("id", booking["id"])
                .execute()
            )
            for user_id in (booking["renter_id"], booking["owner_id"]):
                supabase_admin.table("notifications").insert({
                    "user_id": user_id,
                    "type": "lease_completed",
                    "title": "Lease Completed",
                    "body": "A booking lease has ended automatically.",
                    "metadata": {"booking_id": booking["id"], "listing_id": booking["listing_id"]},
                }).execute()
        except Exception:
            pass


async def send_lease_warnings_once():
    target = (date.today() + timedelta(days=7)).isoformat()
    try:
        result = (
            supabase_admin.table("bookings")
            .select("id, renter_id, owner_id, listing_id")
            .eq("status", "active")
            .eq("end_date", target)
            .execute()
        )
    except Exception:
        return

    for booking in result.data or []:
        try:
            for user_id in (booking["renter_id"], booking["owner_id"]):
                supabase_admin.table("notifications").insert({
                    "user_id": user_id,
                    "type": "lease_ending_soon",
                    "title": "Lease Ending Soon",
                    "body": "A booking lease ends in 7 days.",
                    "metadata": {"booking_id": booking["id"], "listing_id": booking["listing_id"]},
                }).execute()
        except Exception:
            pass


async def lease_checker_loop():
    while True:
        await complete_expired_leases_once()
        await send_lease_warnings_once()
        await asyncio.sleep(60 * 60 * 24)
