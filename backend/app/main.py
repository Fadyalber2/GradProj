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
from app.projects.router import router as projects_router
from app.leads.router import router as leads_router

app = FastAPI(
    title="AXIOM V2 API",
    version="2.0.0",
    description="AI-powered real estate platform API for Egypt",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
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
app.include_router(projects_router, prefix="/api/projects", tags=["projects"])
app.include_router(leads_router, prefix="/api", tags=["leads"])
