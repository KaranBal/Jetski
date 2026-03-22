from fastapi import APIRouter
from .source import router as source_router
from .raw_customer import router as raw_router
from .golden_record import router as golden_router
from .customer_ingest import router as ingest_router

api_router = APIRouter()
api_router.include_router(source_router)
api_router.include_router(raw_router)
api_router.include_router(golden_router)
api_router.include_router(ingest_router)
