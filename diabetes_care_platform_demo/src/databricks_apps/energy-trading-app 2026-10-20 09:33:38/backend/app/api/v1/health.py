from fastapi import APIRouter
import os
from pathlib import Path
from app.core.settings import get_settings
from app.services.mock.loader import get_mock_loader
from app.services.databricks_client import get_databricks_client
from app.services.genie import genie_service

router = APIRouter()


@router.get("/health", tags=["health"])  # /api/v1/health
async def health() -> dict:
    return {"status": "ok"}


@router.get("/debug/paths", tags=["debug"])  # /api/v1/debug/paths
async def debug_paths() -> dict:
    """Debug endpoint to check path resolution."""
    settings = get_settings()
    loader = get_mock_loader()
    
    # Check various paths
    current_dir = os.getcwd()
    file_dir = Path(__file__).resolve().parent
    
    # Check if mock files exist in various locations
    mock_paths = [
        settings.mock_data_dir,
        os.path.join(current_dir, "infra", "local", "mock"),
        os.path.join(os.path.dirname(current_dir), "infra", "local", "mock"),
    ]
    
    mock_files_exist = {}
    for path in mock_paths:
        trades_file = os.path.join(path, "trades.json")
        mock_files_exist[path] = os.path.exists(trades_file)
    
    # List directory contents to help debug
    current_dir_contents = []
    try:
        current_dir_contents = os.listdir(current_dir)
    except Exception as e:
        current_dir_contents = [f"Error listing directory: {e}"]
    
    parent_dir_contents = []
    try:
        parent_dir_contents = os.listdir(os.path.dirname(current_dir))
    except Exception as e:
        parent_dir_contents = [f"Error listing parent directory: {e}"]
    
    return {
        "current_working_directory": current_dir,
        "file_directory": str(file_dir),
        "settings_mock_data_dir": settings.mock_data_dir,
        "loader_base_dir": loader.base_dir,
        "mock_files_exist": mock_files_exist,
        "current_dir_contents": current_dir_contents,
        "parent_dir_contents": parent_dir_contents,
        "environment_variables": {
            "MOCK_DATA_DIR": os.getenv("MOCK_DATA_DIR", "NOT_SET"),
            "DATABRICKS_HOST": os.getenv("DATABRICKS_HOST", "NOT_SET"),
            "DATABRICKS_RUNTIME_VERSION": os.getenv("DATABRICKS_RUNTIME_VERSION", "NOT_SET"),
        }
    }


@router.get("/databricks", tags=["health"])  # /api/v1/databricks
async def databricks_health_check():
    """Check Databricks connection health."""
    databricks_client = get_databricks_client()
    
    # Test de la connexion
    connection_test_passed = databricks_client.test_connection()
    connection_status = databricks_client.get_connection_status()
    
    # Status du service Genie
    genie_auth_status = genie_service.get_auth_status()
    
    overall_status = "healthy" if connection_test_passed and genie_service._is_configured() else "degraded"
    
    return {
        "status": overall_status,
        "timestamp": os.getenv("REQUEST_TIMESTAMP", "unknown"),
        "service": "Databricks Connection",
        "connection_test_passed": connection_test_passed,
        "databricks_connection": connection_status,
        "genie_service": {
            "is_configured": genie_service._is_configured(),
            "auth_status": genie_auth_status
        },
        "recommendations": _get_health_recommendations(connection_status, genie_auth_status)
    }


def _get_health_recommendations(connection_status: dict, genie_auth_status: dict) -> list:
    """Générer des recommandations basées sur le statut de santé."""
    recommendations = []
    
    if not connection_status.get('connected', False):
        recommendations.append("Vérifiez vos variables d'environnement DATABRICKS_HOST, DATABRICKS_CLIENT_ID et DATABRICKS_CLIENT_SECRET")
        
        if connection_status.get('auth_method') == 'none':
            recommendations.append("Aucune méthode d'authentification configurée. Configurez soit CLIENT_ID/CLIENT_SECRET soit DATABRICKS_TOKEN")
        
        if connection_status.get('error'):
            recommendations.append(f"Erreur de connexion: {connection_status['error']}")
    
    if not genie_auth_status.get('is_configured', False):
        recommendations.append("Service AgentBricks non configuré. Vérifiez AGENTBRICKS_ENDPOINT")
    
    available_vars = genie_auth_status.get('available_env_vars', {})
    if not any([available_vars.get('DATABRICKS_CLIENT_ID'), available_vars.get('DATABRICKS_TOKEN')]):
        recommendations.append("Configurez soit DATABRICKS_CLIENT_ID/DATABRICKS_CLIENT_SECRET soit DATABRICKS_TOKEN")
    
    if not recommendations:
        recommendations.append("Tous les services Databricks sont correctement configurés!")
    
    return recommendations

