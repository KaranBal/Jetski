from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from datetime import datetime
import os

DATABASE_URL = "sqlite:///./portfolio.db"

# For testing or if we need a persistent file path, we can locate it in the workspace
# Let's place it in the workspace directory or a subdirectory if needed.
# Let's use the local file for simplicity.

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

class Company(Base):
    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String, unique=True, index=True, nullable=False)
    name = Column(String)
    quantity = Column(Float, default=0.0)
    
    # Analysis Fields
    short_term_thesis = Column(Text)
    medium_term_thesis = Column(Text)
    long_term_thesis = Column(Text)
    category = Column(String) # Great Buy, Good Buy, Better off with S&P500
    
    # Must Own Applications or other notes
    must_own_apps = Column(Text) # JSON string or comma-separated
    
    # Metrics (Optional Cache)
    growth = Column(Float)
    gross_margin = Column(Float)
    fcf_margin = Column(Float)
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def init_db():
    Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
