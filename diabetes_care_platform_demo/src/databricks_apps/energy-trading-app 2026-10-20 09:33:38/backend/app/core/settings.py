from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List, Union
import os
from pathlib import Path


def _find_mock_data_dir() -> str:
    """Find the mock data directory using multiple fallback strategies."""
    _env_mock_dir = os.getenv("MOCK_DATA_DIR")
    if _env_mock_dir:
        _mock_dir_path = Path(_env_mock_dir)
        if not _mock_dir_path.is_absolute():
            # Try to find the project root relative to current working directory
            _repo_root = Path.cwd()
            _mock_dir_path = (_repo_root / _mock_dir_path).resolve()
        return str(_mock_dir_path)
    else:
        # Try multiple possible locations for the mock data directory
        # Use relative paths that work in deployment environments
        possible_paths = [
            # Relative to current working directory (most common in deployments)
            Path.cwd() / "infra" / "local" / "mock",
            # Relative to the source code directory (for Databricks Apps)
            Path.cwd() / "infra" / "local" / "mock",
            # Alternative: try to go up from current directory
            Path.cwd().parent / "infra" / "local" / "mock",
            # Fallback: use absolute path calculation (for local development)
            Path(__file__).resolve().parents[3] / "infra" / "local" / "mock",
        ]
        
        for path in possible_paths:
            if path.exists():
                return str(path.resolve())
        
        # Fallback to current working directory + infra/local/mock
        return str((Path.cwd() / "infra" / "local" / "mock").resolve())


class Settings(BaseSettings):
    environment: str = "local"

    # CORS
    cors_allow_origins: List[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    
    @field_validator('cors_allow_origins', mode='before')
    @classmethod
    def parse_cors_origins(cls, v: Union[List[str], str]) -> List[str]:
        """Parse CORS origins from either list or comma-separated string."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(',') if origin.strip()]
        return v

    # Databricks Configuration simplifiée
    databricks_host: str = ""
    databricks_client_id: str = ""
    databricks_client_secret: str = ""
    databricks_token: str = ""  # Fallback pour développement local
    
    # Configuration AgentBricks
    agentbricks_endpoint: str = ""

    # Mock data directory
    mock_data_dir: str = _find_mock_data_dir()

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        # Éviter l'auto-parsing JSON pour certains champs
        env_parse_none_str = 'None'


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore


def clear_settings_cache():
    """Clear the settings cache to force reload."""
    get_settings.cache_clear()
