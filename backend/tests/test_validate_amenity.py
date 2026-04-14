"""Tests for POST /api/ai/validate-amenity."""
from unittest.mock import AsyncMock
import pytest


def _get_ollama(client):
    import app.ai.router as ai_router
    return ai_router.ollama


def test_validate_amenity_empty_string(client, mock_supabase):
    resp = client.post("/api/ai/validate-amenity", json={"amenity": ""})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False
    assert data["reason"] != ""


def test_validate_amenity_whitespace_only(client, mock_supabase):
    resp = client.post("/api/ai/validate-amenity", json={"amenity": "   "})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False


def test_validate_amenity_ollama_down_fail_open(client, mock_supabase):
    """If Ollama is down the endpoint returns ok=True (fail-open)."""
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=False)

    resp = client.post("/api/ai/validate-amenity", json={"amenity": "Rooftop Terrace"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True


def test_validate_amenity_appropriate(client, mock_supabase):
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=True)
    ollama.generate = AsyncMock(
        return_value='{"appropriate": true, "reason": ""}'
    )

    resp = client.post("/api/ai/validate-amenity", json={"amenity": "Solar Panels"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is True
    assert "reason" in data


def test_validate_amenity_inappropriate(client, mock_supabase):
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=True)
    ollama.generate = AsyncMock(
        return_value='{"appropriate": false, "reason": "Contains offensive content"}'
    )

    resp = client.post("/api/ai/validate-amenity", json={"amenity": "offensive text here"})
    assert resp.status_code == 200
    data = resp.json()
    assert data["ok"] is False
    assert data["reason"] == "Contains offensive content"


def test_validate_amenity_malformed_ollama_response_fails_open(client, mock_supabase):
    """If Ollama returns non-JSON, endpoint fails open (ok=True)."""
    ollama = _get_ollama(client)
    ollama.health = AsyncMock(return_value=True)
    ollama.generate = AsyncMock(return_value="not json at all")

    resp = client.post("/api/ai/validate-amenity", json={"amenity": "Balcony"})
    assert resp.status_code == 200
    assert resp.json()["ok"] is True
