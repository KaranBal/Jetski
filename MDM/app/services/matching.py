from sqlalchemy.orm import Session
from app.models.raw_customer import RawCustomerData
from app.models.golden_record import GoldenCustomerRecord
from app.models.source import SourceSystem
from datetime import datetime

from difflib import SequenceMatcher

def compute_similarity(str1: str, str2: str) -> float:
    """Returns ratio of similarity between two strings."""
    if not str1 or not str2:
         return 0.0
    return SequenceMatcher(None, str1.lower(), str2.lower()).ratio()

def match_and_merge_customer(db: Session, raw_id: str) -> str:
    """
    Looks for existing Golden Records based on Fuzzy Matchscoring threshold (0.85).
    Updates Golden record using Survivorship rules from GEMINI.md.
    """
    raw_record = db.query(RawCustomerData).filter(RawCustomerData.raw_id == raw_id).first()
    if not raw_record:
        return None

    # Fetch all golden records for similarity comparisons
    all_golden_records = db.query(GoldenCustomerRecord).all()
    
    best_golden_record = None
    highest_match_score = 0.0
    
    AUTO_LINK_THRESHOLD = 150.0
    CLERICAL_REVIEW_THRESHOLD = 80.0

    # 2. Iterate and score probabilistic weights
    for golden in all_golden_records:
        score = 0
        
        # Probabilistic weights (Scaled by 10)
        W_FIRST_NAME_A = 100
        W_FIRST_NAME_D = -40
        W_LAST_NAME_A = 120
        W_LAST_NAME_D = -40
        W_EMAIL_A = 160
        W_EMAIL_D = -35
        W_PHONE_A = 140
        W_PHONE_D = -30

        # First Name
        if raw_record.first_name and golden.first_name:
             sim = compute_similarity(raw_record.first_name, golden.first_name)
             if sim > 0.95: score += W_FIRST_NAME_A
             elif sim > 0.80: score += W_FIRST_NAME_A // 2
             else: score += W_FIRST_NAME_D

        # Last Name
        if raw_record.last_name and golden.last_name:
             sim = compute_similarity(raw_record.last_name, golden.last_name)
             if sim > 0.95: score += W_LAST_NAME_A
             elif sim > 0.80: score += W_LAST_NAME_A // 2
             else: score += W_LAST_NAME_D

        # Email
        if raw_record.email and golden.email:
             sim = compute_similarity(raw_record.email, golden.email)
             if sim > 0.95: score += W_EMAIL_A
             elif sim > 0.85: score += W_EMAIL_A // 2
             else: score += W_EMAIL_D

        # Phone
        if raw_record.phone and golden.phone:
             sim = compute_similarity(raw_record.phone, golden.phone)
             if sim > 0.95: score += W_PHONE_A
             elif sim > 0.85: score += W_PHONE_A // 2
             else: score += W_PHONE_D

        if score > highest_match_score:
             highest_match_score = score
             best_golden_record = golden

    # 3. IF MATCH ABOVE AUTO-LINK THRESHOLD: Apply Survivorship rules
    if best_golden_record and highest_match_score >= AUTO_LINK_THRESHOLD:
        golden_record = best_golden_record
        
        all_raw_links = db.query(RawCustomerData).filter(
            RawCustomerData.golden_id == golden_record.golden_id
        ).all()
        all_raw_links.append(raw_record)

        # Rule 1: Highest Trust System Wins for Name & Email
        raw_sorted_by_trust = sorted(
            all_raw_links, 
            key=lambda r: r.source_system.reliability_score if r.source_system else 0,
            reverse=True
        )
        
        best_trust = raw_sorted_by_trust[0]
        golden_record.first_name = best_trust.first_name or golden_record.first_name
        golden_record.last_name = best_trust.last_name or golden_record.last_name
        golden_record.email = best_trust.email or golden_record.email

        # Rule 2: Most Recent Wins for Phone
        raw_sorted_by_recency = sorted(
            all_raw_links,
            key=lambda r: r.ingested_at,
            reverse=True
        )
        best_recency = raw_sorted_by_recency[0]
        golden_record.phone = best_recency.phone or golden_record.phone

        golden_record.confidence_score = (golden_record.confidence_score * 0.7) + (0.3 * (highest_match_score / 300.0))
        golden_record.updated_at = datetime.utcnow()
        
        db.add(golden_record)
        db.commit()
        
        raw_record.golden_id = golden_record.golden_id
        raw_record.match_score = highest_match_score
        db.add(raw_record)
        db.commit()
        return golden_record.golden_id

    # 4. IF NO MATCH: Create New Golden Record
    else:
        new_golden = GoldenCustomerRecord(
            first_name=raw_record.first_name,
            last_name=raw_record.last_name,
            email=raw_record.email,
            phone=raw_record.phone,
            address_line=raw_record.address_line,
            city=raw_record.city,
            zip_code=raw_record.zip_code,
            country=raw_record.country,
            confidence_score=1.0 
        )
        db.add(new_golden)
        db.commit()
        db.refresh(new_golden)
        
        # Link raw to new Golden
        raw_record.golden_id = new_golden.golden_id
        raw_record.match_score = highest_match_score # Save if tie score or low score
        db.add(raw_record)
        db.commit()
        
        return new_golden.golden_id
