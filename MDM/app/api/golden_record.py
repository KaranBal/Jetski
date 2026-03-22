from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.golden_record import GoldenCustomerRecord as GoldenRecordModel
from app.schemas.golden_record import GoldenCustomerRecord

router = APIRouter(prefix="/golden", tags=["Golden Records"])

@router.get("/", response_model=List[GoldenCustomerRecord])
def get_golden_records(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    records = db.query(GoldenRecordModel).offset(skip).limit(limit).all()
    return records

@router.get("/{golden_id}", response_model=GoldenCustomerRecord)
def get_golden_record(golden_id: str, db: Session = Depends(get_db)):
    record = db.query(GoldenRecordModel).filter(GoldenRecordModel.golden_id == golden_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Golden Record not found")
    return record

@router.get("/{golden_id}/raw", tags=["Golden Records"])
def get_golden_record_lineage(golden_id: str, db: Session = Depends(get_db)):
    """
    Returns the associated row data contributing to this golden record.
    """
    record = db.query(GoldenRecordModel).filter(GoldenRecordModel.golden_id == golden_id).first()
    if not record:
         raise HTTPException(status_code=404, detail="Golden Record not found")
         
    return [
         {
             "raw_id": raw.raw_id,
             "source": raw.source_system.source_name,
             "match_score": raw.match_score
         } for raw in record.raw_records
    ]
