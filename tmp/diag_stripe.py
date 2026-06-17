import os, sys, json
sys.path.insert(0, os.path.dirname(__file__) + "/../backend")
from dotenv import load_dotenv
load_dotenv(os.path.dirname(__file__) + "/../backend/.env")
import stripe
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

def md(obj):
    try:
        m = obj["metadata"]
    except Exception:
        return {}
    try:
        return m.to_dict()
    except Exception:
        return dict(m) if m else {}

def has(obj, k):
    try:
        obj[k]
        return True
    except Exception:
        return False

print("=== recent checkout sessions (10) ===")
for s in stripe.checkout.Session.list(limit=10).data:
    print(json.dumps({
        "id": s.id, "status": s.status, "payment_status": s.payment_status,
        "mode": s.mode, "subscription": s.subscription, "customer": s.customer,
        "metadata": md(s), "created": s.created,
    }, default=str))

print("\n=== recent subscriptions (10) ===")
for sub in stripe.Subscription.list(limit=10).data:
    print(json.dumps({
        "id": sub.id, "status": sub.status, "customer": sub.customer,
        "metadata": md(sub), "created": sub.created,
        "has_current_period_end": has(sub, "current_period_end"),
        "current_period_end": sub["current_period_end"] if has(sub, "current_period_end") else "MISSING",
    }, default=str))

print("\n=== recent events (25) ===")
for e in stripe.Event.list(limit=25).data:
    print(e.type, e.id, e.created, "pending_webhooks=", e.pending_webhooks)
