from pydantic import BaseModel
from typing import Optional


class CreateViewingRequest(BaseModel):
    listing_id: str
    scheduled_at: str  # ISO8601 datetime string
    notes: Optional[str] = None


class UpdateViewingRequest(BaseModel):
    status: str  # "confirmed" | "cancelled"
