from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    app_name: str = "ClientPulse CRM"
    environment: str = "development"
    database_url: str = f"sqlite:///{(BACKEND_DIR / 'clientpulse.db').as_posix()}"
    secret_key: str = "change-me-before-production"
    access_token_minutes: int = 480
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    whatsapp_mode: str = "mock"
    whatsapp_verify_token: str = "clientpulse-demo-token"
    whatsapp_access_token: str = ""
    whatsapp_phone_number_id: str = ""
    whatsapp_api_version: str = "v22.0"

    google_sheets_mode: str = "csv"
    google_service_account_file: str = ""
    google_spreadsheet_id: str = ""

    ai_provider: str = "mock"
    ai_api_key: str = ""
    ai_model: str = "provider-model"

    frontend_url: str = "http://localhost:5173"
    backend_public_url: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=(PROJECT_DIR / ".env", PROJECT_DIR / ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
