from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
from pathlib import Path
from dotenv import load_dotenv
from . import members, auth, invites, trees, relationships, memberships, users

# Load .env in development so env vars are available when running locally
load_dotenv()

# CORS configuration
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3050").split(",")

app = FastAPI(title="Family Tree Backend (dev)")

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
    return {"message": "Hello from Family Tree backend (dev)"}


app.include_router(members.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(invites.router, prefix="/api")
app.include_router(trees.router, prefix="/api")
app.include_router(relationships.router, prefix="/api")
app.include_router(memberships.router, prefix="/api")
app.include_router(users.router)

# Mount static files for avatar uploads
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "./uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

