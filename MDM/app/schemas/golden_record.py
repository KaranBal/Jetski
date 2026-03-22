from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

class GoldenCustomerRecordBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address_line: Optional[str] = None
    city: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class GoldenCustomerRecordUpdate(GoldenCustomerRecordBase):
    pass

class GoldenCustomerRecord(GoldenCustomerRecordBase):
    golden_id: str
    confidence_score: float
    last_applied_rule_id: Optional[str] = None
    updated_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True

from typing import List

class GoldenCustomerRecordWithSources(GoldenCustomerRecord):
    contributing_source_ids: List[str]
