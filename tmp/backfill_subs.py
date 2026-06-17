"""One-off backfill: sync DB subscription rows from active Stripe subscriptions.
Mirrors app.stripe_webhooks.router._sync_subscription. DB writes only; no Stripe mutation.
Repairs accounts that paid while the webhook metadata bug was live."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__) + "/../backend")
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv(os.path.dirname(__file__) + "/../backend/.env")

import stripe
from supabase import create_client

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])


def field(obj, key):
    try:
        return obj[key]
    except Exception:
        return None


def epoch_to_iso(value):
    return datetime.fromtimestamp(int(value), tz=timezone.utc).isoformat() if value else None


def current_period_end(sub):
    v = field(sub, "current_period_end")
    if v:
        return v
    items = field(sub, "items")
    data = field(items, "data") if items is not None else None
    if data:
        return field(data[0], "current_period_end")
    return None


# Oldest first so the newest active subscription wins on conflict per user.
subs = sorted(stripe.Subscription.list(status="active", limit=100).data, key=lambda s: s["created"])
print(f"Found {len(subs)} active Stripe subscriptions")

for sub in subs:
    md = field(sub, "metadata") or {}
    user_id = field(md, "user_id")
    plan = field(md, "plan") or "basic"
    if not user_id:
        print(f"  skip {sub['id']}: no user_id in metadata (md={dict(md.to_dict()) if hasattr(md,'to_dict') else md})")
        continue
    row = {
        "user_id": user_id,
        "plan": plan,
        "status": "active",
        "stripe_subscription_id": field(sub, "id"),
        "stripe_customer_id": field(sub, "customer"),
        "current_period_end": epoch_to_iso(current_period_end(sub)),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    sb.table("subscriptions").upsert(row, on_conflict="user_id").execute()
    print(f"  upserted user={user_id} plan={plan} sub={sub['id']} cpe={row['current_period_end']}")

print("\n=== verify affected users ===")
for uid in ["af10546f-fdff-43a0-aec1-a34ed5209f68"]:
    r = sb.table("subscriptions").select("user_id,plan,status,stripe_subscription_id,current_period_end").eq("user_id", uid).execute().data
    print(r)
