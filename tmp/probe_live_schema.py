import os, json, sys
sys.path.insert(0, os.path.dirname(__file__) + "/../backend")
from dotenv import load_dotenv
load_dotenv(os.path.dirname(__file__) + "/../backend/.env")
from supabase import create_client

url = os.environ["SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
sb = create_client(url, key)

tables = [
    "agencies", "blog_posts", "booking_disbursements", "bookings", "favorites",
    "housemates", "knowledge_chunks", "leads", "listing_applications", "listings",
    "neighborhoods", "notifications", "payments", "profiles", "projects",
    "subscriptions", "universities", "viewings",
]

out = {}
for t in tables:
    try:
        res = sb.table(t).select("*").limit(1).execute()
        cols = sorted(res.data[0].keys()) if res.data else "EMPTY_TABLE_NO_COLS_VISIBLE"
        out[t] = cols
    except Exception as e:
        out[t] = f"ERROR: {e}"

print(json.dumps(out, indent=2, default=str))
