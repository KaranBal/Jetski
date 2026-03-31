from fastapi.testclient import TestClient
import pytest
import os

from PortfolioAnalysis.backend.main import app
from PortfolioAnalysis.backend.database import get_db, Base, engine

# Setup test DB
TEST_DATABASE_URL = "sqlite:///./test_portfolio.db"

@pytest.fixture(scope="module")
def test_client():
    client = TestClient(app)
    yield client
    # Cleanup
    if os.path.exists("test_portfolio.db"):
        os.remove("test_portfolio.db")

def test_health(test_client):
    response = test_client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_get_companies(test_client):
    response = test_client.get("/api/companies")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_upload_csv(test_client):
    csv_content = "Ticker,Name,Quantity\nNVDA,Nvidia,10\nTSLA,Tesla,5"
    files = {"file": ("test.csv", csv_content, "text/csv")}
    response = test_client.post("/api/upload_csv", files=files)
    assert response.status_code == 200
    assert response.json()["companies_processed"] == 2

def test_portfolio_rating(test_client):
    response = test_client.get("/api/portfolio_rating")
    assert response.status_code == 200
    assert "rating" in response.json()

def test_analyze_bulk(test_client):
    payload = {"tickers": ["NVDA", "TSLA"]}
    response = test_client.post("/api/analyze_bulk", json=payload)
    assert response.status_code == 200
    assert "Queued" in response.json()["message"]

def test_delete_companies(test_client):
    payload = {"tickers": ["NVDA", "TSLA"]}
    response = test_client.post("/api/delete_companies", json=payload)
    assert response.status_code == 200
    assert "Deleted" in response.json()["message"]
