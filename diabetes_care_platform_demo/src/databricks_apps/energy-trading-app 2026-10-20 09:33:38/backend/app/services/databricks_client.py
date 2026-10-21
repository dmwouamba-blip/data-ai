"""
Service centralisé pour la gestion des connexions Databricks.
Utilise les meilleures pratiques de sécurité et de configuration.
"""
import os
import logging
import time
from typing import Optional, Dict, Any
from functools import lru_cache

from databricks.sdk import WorkspaceClient
from databricks.sdk.core import Config
import requests

from app.core.settings import get_settings

logger = logging.getLogger(__name__)


class DatabricksConnectionError(Exception):
    """Exception levée quand la connexion Databricks échoue."""
    pass


class DatabricksClientService:
    """Service centralisé pour toutes les connexions Databricks."""
    
    def __init__(self):
        self._workspace_client: Optional[WorkspaceClient] = None
        self._config: Optional[Config] = None
        self._settings = get_settings()
        self._connection_status = {
            'connected': False,
            'host': None,
            'auth_method': None,
            'last_check': None,
            'error': None
        }
    
    @property
    def workspace_client(self) -> WorkspaceClient:
        """Obtenir le client Databricks workspace avec connexion paresseuse."""
        if self._workspace_client is None:
            self._workspace_client = self._create_workspace_client()
        return self._workspace_client
    
    @property 
    def config(self) -> Config:
        """Obtenir la configuration Databricks actuelle."""
        if self._config is None:
            self._config = self._create_config()
        return self._config
    
    def _create_config(self) -> Config:
        """Créer la configuration Databricks avec les meilleures pratiques de sécurité."""
        try:
            config_params = {}
            
            # Host (requis)
            if not self._settings.databricks_host:
                raise DatabricksConnectionError("DATABRICKS_HOST est requis")
            
            config_params['host'] = self._settings.databricks_host
            
            # Authentification par service principal (méthode recommandée)
            if self._settings.databricks_client_id and self._settings.databricks_client_secret:
                config_params['client_id'] = self._settings.databricks_client_id
                config_params['client_secret'] = self._settings.databricks_client_secret
                logger.info("Configuration avec authentification service principal")
                self._connection_status['auth_method'] = 'service_principal'
            
            # Fallback vers token pour développement local uniquement
            elif self._settings.databricks_token:
                config_params['token'] = self._settings.databricks_token
                logger.info("Configuration avec token d'authentification (développement local)")
                self._connection_status['auth_method'] = 'token'
            
            else:
                raise DatabricksConnectionError(
                    "Aucune méthode d'authentification configurée. "
                    "Configurez soit DATABRICKS_CLIENT_ID/DATABRICKS_CLIENT_SECRET "
                    "soit DATABRICKS_TOKEN"
                )
            
            config = Config(**config_params)
            self._connection_status['host'] = self._settings.databricks_host
            
            return config
            
        except Exception as e:
            error_msg = f"Erreur lors de la création de la configuration Databricks: {str(e)}"
            logger.error(error_msg)
            self._connection_status['error'] = error_msg
            raise DatabricksConnectionError(error_msg)
    
    def _create_workspace_client(self) -> WorkspaceClient:
        """Créer un client workspace Databricks."""
        try:
            # Utiliser la configuration créée
            config = self.config
            client = WorkspaceClient(config=config)
            
            # Test de la connexion
            try:
                # Appel simple pour vérifier la connexion
                client.current_user.me()
                self._connection_status['connected'] = True
                self._connection_status['last_check'] = time.time()
                self._connection_status['error'] = None
                logger.info("Connexion Databricks établie avec succès")
                
            except Exception as e:
                logger.warning(f"Impossible de valider la connexion Databricks: {e}")
                self._connection_status['connected'] = False
                self._connection_status['error'] = str(e)
                # Ne pas lever d'exception ici pour permettre l'utilisation ultérieure
            
            return client
            
        except Exception as e:
            error_msg = f"Erreur lors de la création du client Databricks: {str(e)}"
            logger.error(error_msg)
            self._connection_status['error'] = error_msg
            raise DatabricksConnectionError(error_msg)
    
    
    def get_connection_status(self) -> Dict[str, Any]:
        """Obtenir le statut actuel de la connexion Databricks."""
        return self._connection_status.copy()
    
    def test_connection(self) -> bool:
        """Tester la connexion Databricks."""
        try:
            client = self.workspace_client
            user = client.current_user.me()
            
            self._connection_status.update({
                'connected': True,
                'last_check': time.time(),
                'error': None,
                'user_info': {
                    'id': user.id,
                    'username': user.user_name,
                    'display_name': user.display_name
                }
            })
            
            logger.info(f"Test de connexion réussi. Utilisateur: {user.user_name}")
            return True
            
        except Exception as e:
            error_msg = f"Test de connexion échoué: {str(e)}"
            logger.error(error_msg)
            
            self._connection_status.update({
                'connected': False,
                'last_check': time.time(),
                'error': error_msg
            })
            
            return False
    
    def reset_connection(self):
        """Réinitialiser la connexion Databricks."""
        self._workspace_client = None
        self._config = None
        self._connection_status.update({
            'connected': False,
            'last_check': None,
            'error': None
        })
        logger.info("Connexion Databricks réinitialisée")
    
    def get_auth_headers(self) -> Dict[str, str]:
        """Obtenir les en-têtes d'authentification pour les appels API directs."""
        try:
            config = self.config
            
            # Si on utilise OAuth avec client credentials, obtenir un token
            if hasattr(config, 'client_id') and hasattr(config, 'client_secret'):
                token = self._get_oauth_token(config.host, config.client_id, config.client_secret)
                if token:
                    return {'Authorization': f'Bearer {token}'}
            
            # Utiliser le token direct si disponible
            if hasattr(config, 'token') and config.token:
                return {'Authorization': f'Bearer {config.token}'}
            
            logger.warning("Impossible d'obtenir les en-têtes d'authentification")
            return {}
            
        except Exception as e:
            logger.error(f"Erreur lors de l'obtention des en-têtes d'auth: {e}")
            return {}
    
    def _get_oauth_token(self, host: str, client_id: str, client_secret: str) -> str:
        """Obtenir un token OAuth en utilisant le flux client credentials."""
        try:
            token_url = f"{host}/oidc/v1/token"
            
            data = {
                'grant_type': 'client_credentials',
                'scope': 'all-apis'
            }
            
            auth = (client_id, client_secret)
            
            response = requests.post(token_url, data=data, auth=auth, timeout=30)
            
            if response.status_code == 200:
                token_data = response.json()
                access_token = token_data.get('access_token', '')
                if access_token:
                    logger.info("Token OAuth obtenu avec succès")
                    return access_token
                else:
                    logger.error("Réponse OAuth manque le champ access_token")
                    return ''
            else:
                logger.error(f"Échec de la requête OAuth: {response.status_code} - {response.text}")
                return ''
                
        except Exception as e:
            logger.error(f"Erreur lors de l'obtention du token OAuth: {e}")
            return ''
    
    def is_configured(self) -> bool:
        """Vérifier si le service est correctement configuré."""
        try:
            # Host requis
            if not self._settings.databricks_host:
                return False
            
            # Soit service principal, soit token
            has_service_principal = (
                self._settings.databricks_client_id and 
                self._settings.databricks_client_secret
            )
            has_token = bool(self._settings.databricks_token)
            
            return has_service_principal or has_token
            
        except Exception:
            return False


# Instance singleton
@lru_cache(maxsize=1)
def get_databricks_client() -> DatabricksClientService:
    """Obtenir l'instance singleton du client Databricks."""
    return DatabricksClientService()
