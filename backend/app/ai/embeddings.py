"""
Embedding generation for listings.

Builds a text representation from listing fields, generates a 768-dim vector
via Ollama, and stores it in the listings.embedding column (pgvector).
Silently skips if Ollama is down — can be backfilled later.
"""

from app.ai.ollama_client import ollama
from app.database import supabase_admin


async def embed_listing(listing_id: str) -> bool:
    """
    Generate and store an embedding for a listing.
    Returns True on success, False if skipped or failed.
    """
    if not await ollama.health():
        return False

    # Fetch listing data
    try:
        result = (
            supabase_admin.table("listings")
            .select("title, description, location, city, property_type, category, bedrooms, bathrooms, size_sqm, amenities")
            .eq("id", listing_id)
            .single()
            .execute()
        )
    except Exception:
        return False

    if not result.data:
        return False

    listing = result.data
    text = _build_embed_text(listing)
    if not text:
        return False

    try:
        vector = await ollama.embed(text)
    except Exception:
        return False

    if not vector:
        return False

    # Store the embedding
    try:
        supabase_admin.table("listings").update(
            {"embedding": vector}
        ).eq("id", listing_id).execute()
        return True
    except Exception:
        return False


def _build_embed_text(listing: dict) -> str:
    """Build a text string from listing fields for embedding."""
    parts = []

    if listing.get("title"):
        parts.append(listing["title"])
    if listing.get("description"):
        parts.append(listing["description"])
    if listing.get("location"):
        parts.append(f"Location: {listing['location']}")
    if listing.get("city"):
        parts.append(f"City: {listing['city']}")
    if listing.get("property_type"):
        parts.append(f"Type: {listing['property_type']}")
    if listing.get("category"):
        parts.append(f"Category: {listing['category']}")
    if listing.get("bedrooms") is not None:
        parts.append(f"{listing['bedrooms']} bedrooms")
    if listing.get("bathrooms") is not None:
        parts.append(f"{listing['bathrooms']} bathrooms")
    if listing.get("size_sqm") is not None:
        parts.append(f"{listing['size_sqm']} sqm")
    if listing.get("amenities"):
        parts.append(f"Amenities: {', '.join(listing['amenities'])}")

    return ". ".join(parts)
