import logging
import jwt
from jwt.algorithms import ECAlgorithm
import httpx
from datetime import timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.database import supabase_admin
from app.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)

# ── Load Supabase JWKS public key at module init ─────────────────────────────
_es256_public_key = None

def _load_jwks():
    """Fetch Supabase JWKS and extract the ES256 public key."""
    global _es256_public_key
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    try:
        resp = httpx.get(jwks_url, headers={"apikey": settings.supabase_anon_key}, timeout=10)
        resp.raise_for_status()
        jwks = resp.json()
        for key_data in jwks.get("keys", []):
            if key_data.get("alg") == "ES256" and key_data.get("kty") == "EC":
                _es256_public_key = ECAlgorithm(ECAlgorithm.SHA256).from_jwk(key_data)
                logger.info("Loaded ES256 public key from Supabase JWKS (kid=%s)", key_data.get("kid"))
                return
        logger.warning("No ES256 key found in Supabase JWKS — falling back to HS256")
    except Exception as e:
        logger.warning("Failed to fetch Supabase JWKS: %s — falling back to HS256", e)

_load_jwks()


def _decode_token(token: str) -> dict:
    """Decode a Supabase JWT, trying ES256 (JWKS) first, then HS256 fallback."""
    leeway = timedelta(seconds=30)

    if _es256_public_key is not None:
        try:
            return jwt.decode(
                token,
                _es256_public_key,
                algorithms=["ES256"],
                audience="authenticated",
                leeway=leeway,
            )
        except jwt.InvalidAlgorithmError:
            pass  # Token might be HS256 — fall through

    return jwt.decode(
        token,
        settings.jwt_secret,
        algorithms=["HS256"],
        audience="authenticated",
        leeway=leeway,
    )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Validates the Supabase JWT (ES256 or HS256).
    Then fetches the user's profile from the DB.
    """
    token = credentials.credentials
    try:
        payload = _decode_token(token)
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token: missing sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        logger.error("JWT decode failed: %s", e)
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

    try:
        result = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=401, detail="User profile not found")

    if not result.data:
        raise HTTPException(status_code=401, detail="User profile not found")

    return result.data


async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    """Requires the authenticated user to have the 'admin' role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(optional_security),
) -> dict | None:
    """
    Returns the current user if a valid JWT is provided, otherwise None.
    Used for endpoints that work both logged-in and anonymous.
    """
    if not credentials:
        return None
    try:
        payload = _decode_token(credentials.credentials)
        user_id: str = payload.get("sub")
        if not user_id:
            return None
    except jwt.InvalidTokenError:
        return None

    try:
        result = (
            supabase_admin.table("profiles")
            .select("*")
            .eq("id", user_id)
            .single()
            .execute()
        )
        return result.data if result.data else None
    except Exception:
        return None
