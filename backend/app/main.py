import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.auth.router import router as auth_router
from app.listings.router import router as listings_router
from app.dashboard.router import router as dashboard_router
from app.notifications.router import router as notifications_router
from app.agencies.router import router as agencies_router
from app.viewings.router import router as viewings_router
from app.blog.router import router as blog_router
from app.admin.router import router as admin_router
from app.ai.router import router as ai_router
from app.uploads.router import router as uploads_router
from app.applications.router import router as applications_router
from app.bookings.lease_checker import lease_checker_loop
from app.subscriptions.lapse import lapse_sweep_loop
from app.bookings.router import router as bookings_router
from app.stripe_webhooks.router import router as stripe_webhooks_router
from app.projects.router import router as projects_router
from app.leads.router import router as leads_router
from app.universities.router import router as universities_router
from app.subscriptions.router import router as subscriptions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    lease_task = asyncio.create_task(lease_checker_loop())
    lapse_task = asyncio.create_task(lapse_sweep_loop())
    try:
        yield
    finally:
        for task in (lease_task, lapse_task):
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


app = FastAPI(
    title="AXIOM V2 API",
    version="2.0.0",
    description="AI-powered real estate platform API for Egypt",
    lifespan=lifespan,
)

_dev_origins = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=(
        _dev_origins if settings.environment == "development" else [settings.frontend_url]
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}


app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(listings_router, prefix="/api/listings", tags=["listings"])
app.include_router(dashboard_router, prefix="/api/dashboard", tags=["dashboard"])
app.include_router(notifications_router, prefix="/api/notifications", tags=["notifications"])
app.include_router(agencies_router, prefix="/api/agencies", tags=["agencies"])
app.include_router(viewings_router, prefix="/api/viewings", tags=["viewings"])
app.include_router(blog_router, prefix="/api/blog", tags=["blog"])
app.include_router(admin_router, prefix="/api/admin", tags=["admin"])
app.include_router(ai_router, prefix="/api/ai", tags=["ai"])
app.include_router(uploads_router, prefix="/api/uploads", tags=["uploads"])
app.include_router(applications_router, prefix="/api/applications", tags=["applications"])
app.include_router(bookings_router, prefix="/api/bookings", tags=["bookings"])
app.include_router(stripe_webhooks_router, prefix="/api/stripe", tags=["stripe"])
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(leads_router, prefix="/api", tags=["leads"])
app.include_router(universities_router, prefix="/api/universities", tags=["universities"])
app.include_router(subscriptions_router, prefix="/api/subscriptions", tags=["subscriptions"])
