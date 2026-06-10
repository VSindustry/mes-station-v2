from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import CORS_ORIGINS
from app.routers import auth, users, projects, assignments, qr, notifications, audit, export
from app.routers import purge


app = FastAPI(
    title="MES Station Registration API v2.0",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(assignments.router)
app.include_router(qr.router)
app.include_router(notifications.router)
app.include_router(audit.router)
app.include_router(export.router)
app.include_router(purge.router)

@app.get("/")
def root():
    return {"message": "MES Station Registration API v2.0 is running"}

@app.get("/health")
def health():
    return {"status": "ok"}