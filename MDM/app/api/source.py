from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.source import SourceSystem as SourceSystemModel
from app.schemas.source import SourceSystem, SourceSystemCreate, SourceSystemUpdate

router = APIRouter(prefix="/sources", tags=["Source Systems"])

@router.post("/", response_model=SourceSystem, status_code=status.HTTP_201_CREATED)
def create_source(source: SourceSystemCreate, db: Session = Depends(get_db)):
    db_source = SourceSystemModel(**source.dict())
    db.add(db_source)
    try:
        db.commit()
        db.refresh(db_source)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail="Source name already exists or invalid data.")
    return db_source

@router.get("/", response_model=List[SourceSystem])
def get_sources(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    sources = db.query(SourceSystemModel).offset(skip).limit(limit).all()
    return sources

@router.get("/{source_id}", response_model=SourceSystem)
def get_source(source_id: str, db: Session = Depends(get_db)):
    source = db.query(SourceSystemModel).filter(SourceSystemModel.source_id == source_id).first()
    if not source:
        raise HTTPException(status_code=404, detail="Source System not found")
    return source
