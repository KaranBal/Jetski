from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.raw_customer import RawCustomerData as RawCustomerModel
from app.schemas.raw_customer import RawCustomerData, RawCustomerDataCreate

router = APIRouter(prefix="/raw", tags=["Raw Customer Data"])

@router.post("/", response_model=RawCustomerData, status_code=status.HTTP_201_CREATED)
def ingest_raw_data(data: RawCustomerDataCreate, db: Session = Depends(get_db)):
    # Verify source_id exists first
    from app.models.source import SourceSystem
    source = db.query(SourceSystem).filter(SourceSystem.source_id == data.source_id).first()
    if not source:
        raise HTTPException(status_code=400, detail="Source System ID does not exist.")

    db_raw = RawCustomerModel(**data.dict())
    db.add(db_raw)
    db.commit()
    db.refresh(db_raw)
    
    # MDM Trigger Hook: 
    # In a real MDM, you trigger Match/Merge background task here.
    
    return db_raw

@router.get("/", response_model=List[RawCustomerData])
def get_raw_data(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(RawCustomerModel).offset(skip).limit(limit).all()
    return records
