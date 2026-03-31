from duckduckgo_search import DDGS
import logging
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScrapingService:
    """
    A service that searches DuckDuckGo for news, earnings, Reddit, and YouTube
    discussions about a given ticker/company.
    """

    def __init__(self):
        self.ddgs = DDGS()

    def _safe_search(self, query: str, search_type="text", max_results=5):
        """Wrapper to handle DDG search and prevent crashes."""
        results = []
        try:
            logger.info(f"Searching for query: {query} (Type: {search_type})")
            time.sleep(1.0) # Rate limiting
            
            if search_type == "news":
                # news method is direct
                results = list(self.ddgs.news(query, max_results=max_results))
            else:
                results = list(self.ddgs.text(query, max_results=max_results))
                
        except Exception as e:
            logger.error(f"Error during search for {query}: {e}")
            # Fallback for demo or if rate limited
            results = [{"title": f"Rate limited/Error for {query}", "body": "Try again later", "href": "#"}]
            
        return results

    def get_earnings_news(self, ticker: str):
        query = f"{ticker} earnings report press release"
        return self._safe_search(query, search_type="news")

    def get_latest_news(self, ticker: str):
        query = f"{ticker} stock news"
        return self._safe_search(query, search_type="news")

    def get_online_commentary(self, ticker: str):
        query = f"{ticker} site:reddit.com OR site:twitter.com"
        return self._safe_search(query, search_type="text")

    def get_youtube_discussions(self, ticker: str):
        query = f"{ticker} stock analysis site:youtube.com"
        return self._safe_search(query, search_type="text")

    def get_all_data(self, ticker: str):
        """Aggregate all data sources into a single payload."""
        return {
            "earnings": self.get_earnings_news(ticker),
            "news": self.get_latest_news(ticker),
            "commentary": self.get_online_commentary(ticker),
            "discussions": self.get_youtube_discussions(ticker)
        }

# Example Usage (Commented for deployment)
# if __name__ == "__main__":
#     scraper = ScrapingService()
#     print(scraper.get_all_data("NVDA"))
