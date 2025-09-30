from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from . import db, models, schemas
from typing import List


app = FastAPI(title="Family Tree Backend (dev)")

# Allow local frontend to call backend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.post('/api/members', response_model=schemas.MemberRead)
def create_member(payload: schemas.MemberCreate, db_session: Session = Depends(db.get_db)):
    member = models.Member(name=payload.name, email=payload.email, deceased=payload.deceased)
    db_session.add(member)
    db_session.commit()
    db_session.refresh(member)
    return member


@app.get('/api/members', response_model=List[schemas.MemberRead])
def list_members(skip: int = 0, limit: int = 100, db_session: Session = Depends(db.get_db)):
    return db_session.query(models.Member).offset(skip).limit(limit).all()

