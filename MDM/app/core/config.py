from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Customer MDM API"
    API_V1_STR: str = "/api/v1"
    
    # Database: Default to local SQLite fallback
    DATABASE_URL: str = "sqlite:///./mdm.db"
    
    # Security (Placeholder for header/secret key validation)
    API_KEY_NAME: str = "access_token"
    SECRET_API_KEY: Optional[str] = "development-secret-mdm-key"

    class Config:
        env_file = ".env"

settings = Settings()
