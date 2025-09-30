from sqlalchemy import Column, String, Integer, Boolean
from .db import Base


class Member(Base):
    __tablename__ = 'members'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=False, nullable=True)
    deceased = Column(Boolean, default=False)
