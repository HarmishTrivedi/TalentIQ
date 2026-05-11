"""
Application configuration using Pydantic Settings.
Supports multiple AI providers and environments.
"""
from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # App
    app_name: str = "AI Recruitment Intelligence Platform"
    app_version: str = "1.0.0"
    debug: bool = False
    secret_key: str = Field(default="dev-secret-key-change-in-production-32chars")

    # Database
    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/ai_recruitment"
    database_pool_size: int = 10
    database_max_overflow: int = 20

    # AI Provider
    ai_provider: Literal["openai", "groq", "ollama"] = "openai"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_embedding_model: str = "text-embedding-3-small"

    groq_api_key: str = ""
    groq_api_key_2: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"

    # FAISS
    faiss_index_path: str = "./vector_store/faiss_index"
    embedding_dimension: int = 1536

    # Auth
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"
    
    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    microsoft_client_id: str = ""
    microsoft_client_secret: str = ""
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:5173"

    # File Upload
    upload_dir: str = "./uploads"
    max_file_size_mb: int = 10

    # CORS
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",")]

    @property
    def max_file_size_bytes(self) -> int:
        return self.max_file_size_mb * 1024 * 1024


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
