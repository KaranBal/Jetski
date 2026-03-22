from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from .config import settings

# Database URLs starting with 'sqlite' need different connect arguments for FastAPI threading
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}
else:
    connect_args = {}

engine = create_engine(
    settings.DATABASE_URL, connect_args=connect_args, echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency override for FastAPI routes to yield Database session session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
