import json
import os
from typing import Any, List, Optional

from app.core.settings import get_settings


class MockDataLoader:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.base_dir = self.settings.mock_data_dir

    def load_json(self, filename: str) -> List[Any]:
        # Try multiple possible paths for the file
        # Prioritize paths that work in deployment environments
        possible_paths = [
            # Primary: use the configured base directory
            os.path.join(self.base_dir, filename),
            # Fallback: try relative to current working directory (most common in deployments)
            os.path.join(os.getcwd(), "infra", "local", "mock", filename),
            # Fallback: try relative to current working directory parent
            os.path.join(os.path.dirname(os.getcwd()), "infra", "local", "mock", filename),
            # Fallback: try relative to the backend directory (for local development)
            os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "infra", "local", "mock", filename),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
        
        # If none of the paths work, raise an error with all attempted paths
        raise FileNotFoundError(f"Mock data file not found. Tried paths: {possible_paths}")


_loader_singleton: Optional[MockDataLoader] = None


def get_mock_loader() -> MockDataLoader:
    global _loader_singleton
    if _loader_singleton is None:
        _loader_singleton = MockDataLoader()
    return _loader_singleton


def clear_mock_loader_cache():
    """Clear the mock loader cache to force reload."""
    global _loader_singleton
    _loader_singleton = None

