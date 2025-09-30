from pydantic import BaseModel
from typing import Optional


class MemberCreate(BaseModel):
    name: str
    email: Optional[str]
    deceased: Optional[bool] = False


class MemberRead(MemberCreate):
    id: int

    class Config:
        orm_mode = True
