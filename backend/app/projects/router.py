from fastapi import APIRouter, HTTPException
from app.database import supabase_admin

router = APIRouter()


@router.get("/{project_id}")
async def get_project(project_id: str):
    """Return project detail with agency info."""
    try:
        result = (
            supabase_admin.table("projects")
            .select("*, agencies(name, slug, logo_url, verified)")
            .eq("id", project_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Project not found")

    if not result.data:
        raise HTTPException(status_code=404, detail="Project not found")

    p = result.data
    agency = p.get("agencies") or {}

    return {
        "id": p["id"],
        "agency_id": p["agency_id"],
        "title": p["title"],
        "subtitle": (p.get("description") or "")[:100] or None,
        "image_url": p.get("image_url"),
        "completion_pct": p.get("completion_pct", 0),
        "starting_price": float(p["starting_price"]) if p.get("starting_price") is not None else None,
        "status": p.get("status", "planned"),
        "key_features": p.get("key_features") or [],
        "description": p.get("description"),
        "units_total": p.get("units_total"),
        "created_at": p.get("created_at"),
        "agency_name": agency.get("name"),
        "agency_slug": agency.get("slug"),
        "agency_logo": agency.get("logo_url"),
        "agency_verified": bool(agency.get("verified", False)),
    }
