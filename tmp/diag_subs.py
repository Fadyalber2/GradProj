import os, sys, json
sys.path.insert(0, os.path.dirname(__file__) + "/../backend")
from dotenv import load_dotenv
load_dotenv(os.path.dirname(__file__) + "/../backend/.env")
from supabase import create_client

sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

print("=== subscriptions (latest 20) ===")
subs = sb.table("subscriptions").select("*").order("updated_at", desc=True).limit(20).execute().data
for s in subs:
    print(json.dumps({k: s.get(k) for k in (
        "user_id","plan","status","stripe_customer_id","stripe_subscription_id",
        "current_period_end","updated_at")}, default=str))

print("\n=== payments kind=subscription (latest 20) ===")
try:
    pays = sb.table("payments").select("*").eq("kind","subscription").order("created_at", desc=True).limit(20).execute().data
    for p in pays:
        print(json.dumps(p, default=str))
except Exception as e:
    print("payments query error:", e)

print("\n=== ALL payments (latest 20) ===")
try:
    pays = sb.table("payments").select("*").order("created_at", desc=True).limit(20).execute().data
    for p in pays:
        print(json.dumps({k: p.get(k) for k in ("id","user_id","kind","amount","status","created_at")}, default=str))
except Exception as e:
    print("payments query error:", e)
