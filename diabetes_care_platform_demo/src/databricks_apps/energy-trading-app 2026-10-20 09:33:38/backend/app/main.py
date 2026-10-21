from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
import os

from app.core.settings import get_settings
from app.api.v1.health import router as health_router
from app.api.v1.trading import router as trading_router
from app.api.v1.risk import router as risk_router
from app.api.v1.finance import router as finance_router
from app.api.v1.compliance import router as compliance_router
from app.api.v1.genie import router as genie_router


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="ETRM Data 360 API",
        version="1.0.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Health check at root level for Databricks Apps
    @app.get("/health")
    async def root_health() -> dict:
        return {"status": "ok", "service": "etrm-data-360"}

    app.include_router(health_router, prefix="/api/v1")
    app.include_router(trading_router, prefix="/api/v1")
    app.include_router(risk_router, prefix="/api/v1")
    app.include_router(finance_router, prefix="/api/v1")
    app.include_router(compliance_router, prefix="/api/v1")
    app.include_router(genie_router, prefix="/api/v1")

    # Serve built frontend (Vite) if present
    file_path = Path(__file__).resolve()
    project_root = file_path.parents[2]
    default_dist_path = project_root / "frontend" / "dist"

    env_dist_path = os.getenv("FRONTEND_DIST_PATH")
    candidate_paths = []
    if env_dist_path:
        env_path = Path(env_dist_path)
        # If env is relative, resolve from the backend directory (parents[1]) and from project root
        if not env_path.is_absolute():
            candidate_paths.append(file_path.parents[1] / env_path)  # backend/ + relative
            candidate_paths.append(project_root / env_path)          # project_root + relative
        candidate_paths.append(env_path)
    candidate_paths.extend([
        default_dist_path,
        Path.cwd() / "frontend" / "dist",
        Path.cwd().parent / "frontend" / "dist",
    ])

    resolved_dist: str | None = None
    for path in candidate_paths:
        try:
            if path.is_dir():
                resolved_dist = str(path)
                break
        except Exception:
            continue

    if resolved_dist:
        # Mount at root. API stays under /api/*
        app.mount("/", StaticFiles(directory=resolved_dist, html=True), name="static")
    else:
        # Fallback root route to avoid 404 when frontend isn't built yet
        @app.get("/")
        async def root() -> dict:
            return {
                "status": "ok",
                "message": "Frontend is not built. Build with 'npm run build' and redeploy. See /api/docs for API.",
            }

    return app


app = create_app()
