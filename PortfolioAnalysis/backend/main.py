from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, BackgroundTasks
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
import csv
import io
import os
import logging

from .database import get_db, init_db, Company
from .scraping_service import ScrapingService
from .agent_service import AgentService

from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="PortfolioAnalysis API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for local use
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
scraper = ScrapingService()
agent = AgentService()

# Run DB migrations/initialization on startup
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing Database...")
    init_db()

@app.get("/api/health")
def health():
    return {"status": "ok"}

@app.get("/api/companies")
def get_companies(db: Session = Depends(get_db)):
    comps = db.query(Company).all()
    return comps

@app.post("/api/upload_csv")
async def upload_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Expects a CSV with format: Ticker, Name, Quantity
    Or Google Finance export format (if known). We will do standard Ticker, Name, Quantity first.
    """
    content = await file.read()
    decoded = content.decode('utf-8')
    csv_reader = csv.reader(io.StringIO(decoded))
    
    # Try to find header or just parse
    rows = []
    for row in csv_reader:
        if not row:
            continue
        if "Ticker" in row or "Symbol" in row: # Header skip
            continue
        rows.append(row)

    added_count = 0
    for row in rows:
        if len(row) < 3:
            continue
        ticker = row[0].strip().upper()
        # Find quantity
        try:
            qty = float(row[2]) if len(row) > 2 else 0.0
        except:
            qty = 0.0
        
        # Check if exists
        exists = db.query(Company).filter(Company.ticker == ticker).first()
        if exists:
            exists.quantity = qty
        else:
            new_comp = Company(ticker=ticker, name=row[1] if len(row) > 1 else "", quantity=qty)
            db.add(new_comp)
        added_count += 1

    db.commit()
    return {"message": "CSV Parsed", "companies_processed": added_count}

def run_deep_analysis(ticker: str, db_generator):
    """Background task to run scraper and agent analysis."""
    logger.info(f"Background analysis started for {ticker}")
    db = next(db_generator)
    try:
        comp = db.query(Company).filter(Company.ticker == ticker).first()
        if not comp:
            logger.error(f"Company {ticker} not found in DB for analysis")
            return

        # 1. Scrape data
        scraped = scraper.get_all_data(ticker)
        
        # 2. Agent Synthesis
        analysis = agent.synthesize_thesis(ticker, scraped)
        
        # 3. Save to DB
        comp.short_term_thesis = analysis["short_term"]
        comp.medium_term_thesis = analysis["medium_term"]
        comp.long_term_thesis = analysis["long_term"]
        comp.category = analysis["category"]
        comp.must_own_apps = analysis["must_own"]
        
        db.commit()
        logger.info(f"Background analysis completed for {ticker}")
    except Exception as e:
        logger.error(f"Error in background task for {ticker}: {e}")
    finally:
        db.close()

@app.post("/api/analyze/{ticker}")
async def analyze_company(ticker: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    comp = db.query(Company).filter(Company.ticker == ticker).first()
    if not comp:
        raise HTTPException(status_code=404, detail="Company not found in portfolio")

    # Pass generator *creator* to avoid thread session issues, or use a new session
    # We will create a new session inside the thread.
    # Since background_tasks in FastAPI run in same loop/threads, it's safer to pass generator.
    background_tasks.add_task(run_deep_analysis, ticker, get_db())
    return {"message": f"Analysis queued for {ticker}"}

@app.get("/api/portfolio_rating")
def get_portfolio_rating(db: Session = Depends(get_db)):
    comps = db.query(Company).all()
    if not comps:
        return {"rating": "N/A", "narrative": "Add companies to rate portfolio"}

    # Evaluate summary
    categories = {"Great Buy": 0, "Good Buy": 0, "Better off with S&P500": 0}
    for c in comps:
        if c.category in categories:
            categories[c.category] += 1

    total = len(comps)
    if categories["Great Buy"] > total * 0.5:
        rating = "A-Tier Highly Aggressive Compounder Portfolio"
        narrative = "High conviction metrics. Watch valuations."
    elif categories["Better off with S&P500"] > total * 0.4:
        rating = "C-Tier Underperforming Index"
        narrative = "Replace lower tier positions with SPY/QQQ."
    else:
        rating = "B-Tier Solid Diversified Balanced"
        narrative = "Balanced risk reward."

    return {
        "rating": rating,
        "summary": categories,
        "narrative": narrative
    }

class BulkActionRequest(BaseModel):
    tickers: list[str]

@app.post("/api/delete_companies")
def delete_companies(req: BulkActionRequest, db: Session = Depends(get_db)):
    db.query(Company).filter(Company.ticker.in_(req.tickers)).delete(synchronize_session=False)
    db.commit()
    return {"message": f"Deleted {len(req.tickers)} companies"}

@app.post("/api/analyze_bulk")
async def analyze_bulk(req: BulkActionRequest, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    for ticker in req.tickers:
        ticker = ticker.upper()
        comp = db.query(Company).filter(Company.ticker == ticker).first()
        if comp:
            background_tasks.add_task(run_deep_analysis, ticker, get_db())
    return {"message": f"Queued {len(req.tickers)} companies for analysis"}

# Mount frontend (assuming directory is PortfolioAnalysis/frontend)
# Relative path from main.py is ../frontend
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_dir):
    logger.info(f"Mounting frontend from {frontend_dir}")
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
else:
    logger.warning(f"Frontend directory not found at {frontend_dir}! API only.")
