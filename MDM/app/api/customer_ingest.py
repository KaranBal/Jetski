from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.raw_customer import RawCustomerData as RawCustomerModel
from app.schemas.raw_customer import RawCustomerData, RawCustomerDataCreate
from app.services.matching import match_and_merge_customer

router = APIRouter(prefix="/customers", tags=["Customer Ingestion"])

@router.post("/ingest", status_code=status.HTTP_201_CREATED)
def ingest_customer(data: RawCustomerDataCreate, db: Session = Depends(get_db)):
    """
    Ingest a raw customer record from a specific Source System.
    Triggers the Match & Survivorship engine to merge or create Golden Record immediately.
    """
    # 1. Verify source_id exists
    from app.models.source import SourceSystem
    source = db.query(SourceSystem).filter(SourceSystem.source_id == data.source_id).first()
    if not source:
        raise HTTPException(status_code=400, detail="Source System ID does not exist.")

    # 2. Save into Raw Table
    db_raw = RawCustomerModel(**data.dict())
    db.add(db_raw)
    db.commit()
    db.refresh(db_raw)

    # 3. Trigger Matching Engine (Sync trigger for exact match trace)
    golden_id = match_and_merge_customer(db, db_raw.raw_id)

    return {
        "status": "success",
        "message": "Customer data ingested and processed.",
        "raw_record_id": db_raw.raw_id,
        "matched_golden_record_id": golden_id
    }

from app.models.golden_record import GoldenCustomerRecord as GoldenRecordModel
from app.schemas.golden_record import GoldenCustomerRecordWithSources

@router.get("/golden/{golden_id}", response_model=GoldenCustomerRecordWithSources)
def get_golden_record_with_sources(golden_id: str, db: Session = Depends(get_db)):
    """
    Returns the consolidated Golden Record, along with an array of the source system IDs that contributed to it.
    """
    record = db.query(GoldenRecordModel).filter(GoldenRecordModel.golden_id == golden_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Golden Record not found")
        
    # Extract contributing sources
    contributing_source_ids = list(set([raw.source_id for raw in record.raw_records]))
    
    return {
        **record.__dict__,
        "contributing_source_ids": contributing_source_ids
    }
