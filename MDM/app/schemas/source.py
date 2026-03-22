from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class SourceSystemBase(BaseModel):
    source_name: str = Field(..., max_length=50)
    description: Optional[str] = None
    reliability_score: float = Field(default=0.5, ge=0.0, le=1.0)

class SourceSystemCreate(SourceSystemBase):
    pass

class SourceSystemUpdate(BaseModel):
    source_name: Optional[str] = None
    description: Optional[str] = None
    reliability_score: Optional[float] = None

class SourceSystem(SourceSystemBase):
    source_id: str
    created_at: datetime

    class Config:
        from_attributes = True
        # from_attributes is pydantic v2 equivalent for orm_mode = True
