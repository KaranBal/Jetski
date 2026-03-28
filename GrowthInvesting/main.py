from fastapi import FastAPI, HTTPException, BackgroundTasks, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Optional
import csv
import urllib.request
import os
import uuid
import io

# Import our custom Research Agent
from backend.research_agent import ResearchAgent

app = FastAPI(title="Growth Investing API v2", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store for processed results
results_db = {}

class TrackedHolding(BaseModel):
    ticker: str
    company_name: Optional[str] = None
    amount: float
    user_reason: Optional[str] = None

class CsvLinkRequest(BaseModel):
    csv_url: str

@app.get("/api/v1/health")
def health():
    return {"status": "ok", "message": "Growth Traded Agent Node Active"}

@app.post("/api/v1/analyze/manual")
async def analyze_manual(holding: TrackedHolding):
    """Run thorough research agent on a single manual ticker with user rationale."""
    agent = ResearchAgent()
    analysis = await agent.analyze_ticker(holding.ticker, holding.company_name, holding.amount, holding.user_reason)
    
    task_id = str(uuid.uuid4())
    results_db[task_id] = [analysis]
    
    return {"task_id": task_id, "results": [analysis]}

@app.post("/api/v1/analyze/csv")
async def analyze_csv(request: CsvLinkRequest, background_tasks: BackgroundTasks):
    """Asynchronously download and parse CSV Google Sheet links, then run agents."""
    task_id = str(uuid.uuid4())
    results_db[task_id] = [] 

    background_tasks.add_task(process_csv_background, request.csv_url, task_id)
    
    return {"task_id": task_id, "status": "processing", "message": "Multi-agent research harness initialized in background."}

@app.post("/api/v1/analyze/upload")
async def analyze_upload(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    """Asynchronously process a local binary file upload from file dropzones."""
    task_id = str(uuid.uuid4())
    results_db[task_id] = []

    contents = await file.read()
    
    background_tasks.add_task(process_upload_background, contents, task_id)

    return {"task_id": task_id, "status": "processing", "message": "File upload parser multi-agent queued."}

@app.get("/api/v1/results/{task_id}")
def get_results(task_id: str):
    """Retrieve results once background agent finishes."""
    if task_id not in results_db:
        raise HTTPException(status_code=404, detail="Task ID not found")
    
    return {"task_id": task_id, "results": results_db[task_id]}


async def process_csv_background(url: str, task_id: str):
    """Download Google Sheet CSV, parse, and run thorough research agent per row."""
    try:
        # Resolve Google Sheet link to export format if standard URL is given
        if "docs.google.com/spreadsheets" in url and "export" not in url:
            base_url = url.split("/edit")[0]
            url = f"{base_url}/export?format=csv"

        response = urllib.request.urlopen(url)
        lines = [line.decode('utf-8') for line in response.readlines()]
        reader = csv.DictReader(lines)
        
        # Verify columns vs standard spreadsheet format
        # Expecting Ticker, Company Name, Amount (or variations)
        
        agent = ResearchAgent()
        
        for row in reader:
            try:
                # Map column names flexibly
                ticker = row.get("Ticker") or row.get("ticker") or row.get("Symbol")
                company = row.get("Company Name") or row.get("company_name") or row.get("Name")
                amount_str = row.get("Dollar Invested") or row.get("amount") or row.get("Value")
                user_reason = row.get("Why Bought") or row.get("user_reason") or row.get("Rationale") or row.get("Reason")
                
                if ticker and amount_str:
                    amount = float(amount_str.replace('$', '').replace(',', ''))
                    analysis = await agent.analyze_ticker(ticker, company, amount, user_reason)
                    results_db[task_id].append(analysis)
            except Exception as row_error:
                print(f"Skipping bad CSV row: {row_error}")
                # Skip silent or log privately without crashing UI rendering

    except Exception as e:
        print(f"Background CSV Processing Error: {e}")
        # Log failure into db
        results_db[task_id].append({"error": str(e), "failed": True})


async def process_upload_background(contents: bytes, task_id: str):
    """Process uploaded file contents from memory stream using multi-agent parsing."""
    try:
        f_stream = io.StringIO(contents.decode('utf-8'))
        reader = csv.DictReader(f_stream)

        agent = ResearchAgent()
        
        for row in reader:
            try:
                ticker = row.get("Ticker") or row.get("ticker") or row.get("Symbol")
                company = row.get("Company Name") or row.get("company_name") or row.get("Name")
                amount_str = row.get("Dollar Invested") or row.get("amount") or row.get("Value")
                user_reason = row.get("Why Bought") or row.get("user_reason") or row.get("Rationale") or row.get("Reason")
                
                if ticker and amount_str:
                    amount = float(amount_str.replace('$', '').replace(',', ''))
                    analysis = await agent.analyze_ticker(ticker, company, amount, user_reason)
                    results_db[task_id].append(analysis)
            except Exception as row_error:
                print(f"Skipping bad Upload row: {row_error}")
                # Skip silently

    except Exception as e:
        print(f"Background Upload Processing Error: {e}")
        results_db[task_id].append({"error": str(e), "failed": True})


# Mount Static Files (Must be last to avoid overriding API routes)
if os.path.exists("frontend"):
    app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")
else:
    # If root layout flat files
    app.mount("/frontend", StaticFiles(directory=".", html=True), name="frontend")
