from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class RawCustomerDataBase(BaseModel):
    ext_record_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class RawCustomerDataCreate(RawCustomerDataBase):
    source_id: str # Required when submitting raw data

class RawCustomerDataUpdate(RawCustomerDataBase):
    pass

class RawCustomerData(RawCustomerDataBase):
    raw_id: str
    source_id: str
    golden_id: Optional[str] = None
    match_score: float
    ingested_at: datetime

    class Config:
        from_attributes = True
        # from_attributes is pydantic v2 equivalent for orm_mode = True
        orm_mode = True
