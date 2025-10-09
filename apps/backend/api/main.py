from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path
from dotenv import load_dotenv
from . import members, auth, invites, trees, relationships, memberships, users, avatars, notifications, gallery

# Load .env in development so env vars are available when running locally
load_dotenv()

# CORS configuration
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "").split(",")

app = FastAPI(title="Phylo family tree Backend (dev)")

# Allow origins from env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/hello")
def hello():
    return {"message": f"Hello from {app.title}"}


app.include_router(members.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(invites.router, prefix="/api")
app.include_router(trees.router, prefix="/api")
app.include_router(relationships.router, prefix="/api")
app.include_router(memberships.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(avatars.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(gallery.router, prefix="/api")

# Mount static files for avatar uploads
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

