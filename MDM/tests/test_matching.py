import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.database import Base
from app.models.source import SourceSystem
from app.models.raw_customer import RawCustomerData
from app.models.golden_record import GoldenCustomerRecord
from app.services.matching import match_and_merge_customer, compute_similarity

# --- Test DB Setup (In-Memory SQLite) ---
DATABASE_URL = "sqlite:///:memory:"

@pytest.fixture(name="db")
def fixture_db():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)

@pytest.fixture(name="source")
def fixture_source(db):
    source = SourceSystem(
        source_name="Salesforce",
        reliability_score=0.9
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source

# --- Tests ---

def test_similarity_computation():
    assert compute_similarity("John", "John") == 1.0
    assert compute_similarity("John", "Jon") >= 0.85 # High typo match
    assert compute_similarity("John", "Ron") < 0.60  # Dissimilar
    assert compute_similarity(None, "John") == 0.0

def test_exact_match_creation_and_merge(db, source):
    # 1. Ingest First Record -> Creates Golden A
    raw1 = RawCustomerData(
        source_id=source.source_id,
        first_name="Alice",
        last_name="Smith",
        email="alice@example.com"
    )
    db.add(raw1)
    db.commit()
    
    golden_id1 = match_and_merge_customer(db, raw1.raw_id)
    assert golden_id1 is not None

    # 2. Ingest Second Identical Record -> Should Merge into Golden A
    raw2 = RawCustomerData(
        source_id=source.source_id,
        first_name="Alice",
        last_name="Smith",
        email="alice@example.com"
    )
    db.add(raw2)
    db.commit()

    golden_id2 = match_and_merge_customer(db, raw2.raw_id)
    assert golden_id2 == golden_id1 # Validates Merge

def test_fuzzy_match_merge_on_misspelling(db, source):
    # 1. Create Base Record
    raw1 = RawCustomerData(
        source_id=source.source_id,
        first_name="Jonathan",
        last_name="Baker",
        email="jb@example.com"
    )
    db.add(raw1)
    db.commit()
    golden_id1 = match_and_merge_customer(db, raw1.raw_id)

    # 2. Ingest with Typo (Jon vs Jonathan, Baker unchanged)
    raw2 = RawCustomerData(
        source_id=source.source_id,
        first_name="Jon",
        last_name="Baker",
        email="jb@example.com" # email holds weight
    )
    db.add(raw2)
    db.commit()

    golden_id2 = match_and_merge_customer(db, raw2.raw_id)
    assert golden_id2 == golden_id1 # Should Merge

def test_match_fails_below_threshold_creates_new(db, source):
    # 1. Create Base Record
    raw1 = RawCustomerData(
        source_id=source.source_id,
        first_name="Robert",
        last_name="Downey",
        email="rdj@example.com"
    )
    db.add(raw1)
    db.commit()
    golden_id1 = match_and_merge_customer(db, raw1.raw_id)

    # 2. Ingest record with distinct names (fails 85% match even with layout)
    raw2 = RawCustomerData(
        source_id=source.source_id,
        first_name="Rupert",
        last_name="Grint",
        email="rug@example.com"
    )
    db.add(raw2)
    db.commit()

    golden_id2 = match_and_merge_customer(db, raw2.raw_id)
    assert golden_id2 != golden_id1 # Validate separate record split!

def test_missing_email_fallback_fuzzy_names(db, source):
    # 1. Create Base
    raw1 = RawCustomerData(
        source_id=source.source_id,
        first_name="Harry",
        last_name="Potter",
        email=None
    )
    db.add(raw1)
    db.commit()
    golden_id1 = match_and_merge_customer(db, raw1.raw_id)

    # 2. Ingest matching Name with typo without Email
    raw2 = RawCustomerData(
        source_id=source.source_id,
        first_name="Hary",
        last_name="Potter",
        email=None
    )
    db.add(raw2)
    db.commit()

    golden_id2 = match_and_merge_customer(db, raw2.raw_id)
    assert golden_id2 == golden_id1 # Should Merge based on falling back to 100% Name weights
