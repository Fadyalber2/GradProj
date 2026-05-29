# backend/tests/test_subscriptions.py
"""Unit tests for owner-subscription pure logic."""
from datetime import datetime, timedelta, timezone

from app.subscriptions import plans


def _iso(dt):
    return dt.isoformat()


def test_free_plan_caps():
    assert plans.listing_cap(None) == 1
    assert plans.ai_quota(None) == 0


def test_paid_plan_caps():
    assert plans.listing_cap({"plan": "basic", "status": "active"}) == 5
    assert plans.listing_cap({"plan": "pro", "status": "active"}) == 20
    assert plans.ai_quota({"plan": "pro", "status": "active"}) == 50


def test_canceled_subscription_falls_to_free():
    assert plans.effective_plan({"plan": "pro", "status": "canceled"}) == "free"
    assert plans.listing_cap({"plan": "pro", "status": "past_due"}) == 1


def test_active_trial_grants_trial_caps():
    future = _iso(datetime.now(timezone.utc) + timedelta(days=3))
    sub = {"plan": "trial", "status": "trialing", "trial_ends_at": future}
    assert plans.effective_plan(sub) == "trial"
    assert plans.listing_cap(sub) == 3
    assert plans.ai_quota(sub) == 50


def test_expired_trial_falls_to_free():
    past = _iso(datetime.now(timezone.utc) - timedelta(days=1))
    sub = {"plan": "trial", "status": "trialing", "trial_ends_at": past}
    assert plans.effective_plan(sub) == "free"
    assert plans.listing_cap(sub) == 1


def test_ai_remaining_never_negative():
    sub = {"plan": "basic", "status": "active", "ai_descriptions_used": 99}
    assert plans.ai_remaining(sub) == 0
    sub2 = {"plan": "basic", "status": "active", "ai_descriptions_used": 3}
    assert plans.ai_remaining(sub2) == 7


def test_select_listings_to_pause_keeps_newest():
    ids = ["a", "b", "c", "d"]  # a oldest, d newest
    assert plans.select_listings_to_pause(ids, cap=1) == ["a", "b", "c"]
    assert plans.select_listings_to_pause(ids, cap=4) == []
    assert plans.select_listings_to_pause(ids, cap=10) == []
