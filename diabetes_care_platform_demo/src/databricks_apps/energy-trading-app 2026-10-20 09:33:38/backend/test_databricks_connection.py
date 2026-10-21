#!/usr/bin/env python3
"""
Script de test pour vérifier la configuration Databricks.
Utilisé pour valider la connexion avant le déploiement.
"""
import os
import sys
import logging
from pathlib import Path

# Ajouter le répertoire backend au Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

def test_environment_variables():
    """Tester que les variables d'environnement requises sont définies."""
    print("🔧 Test des variables d'environnement...")
    
    required_vars = ['DATABRICKS_HOST']
    
    # Vérifier les variables requises
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Variables manquantes: {', '.join(missing_vars)}")
        return False
    
    # Vérifier l'authentification (Service Principal recommandé)
    has_service_principal = all(os.getenv(var) for var in ['DATABRICKS_CLIENT_ID', 'DATABRICKS_CLIENT_SECRET'])
    has_token = bool(os.getenv('DATABRICKS_TOKEN'))
    
    if has_service_principal:
        print("✅ Authentification Service Principal configurée (RECOMMANDÉ)")
    elif has_token:
        print("⚠️  Authentification par token configurée (développement local uniquement)")
    else:
        print("❌ Aucune méthode d'authentification trouvée")
        print("   RECOMMANDÉ: Configurez DATABRICKS_CLIENT_ID/DATABRICKS_CLIENT_SECRET")
        print("   ALTERNATIVE: Configurez DATABRICKS_TOKEN pour le développement local")
        return False
    
    print("✅ Variables d'environnement correctement configurées")
    return True

def test_databricks_imports():
    """Tester que les modules Databricks peuvent être importés."""
    print("\n📦 Test des imports Databricks...")
    
    try:
        from databricks.sdk import WorkspaceClient
        from databricks.sdk.core import Config
        print("✅ SDK Databricks importé avec succès")
        return True
    except ImportError as e:
        print(f"❌ Erreur d'import SDK Databricks: {e}")
        print("   Installez le SDK avec: pip install databricks-sdk")
        return False

def test_databricks_client_service():
    """Tester le service client Databricks personnalisé."""
    print("\n🔌 Test du service client Databricks...")
    
    try:
        from app.services.databricks_client import get_databricks_client, DatabricksConnectionError
        
        # Obtenir le client
        client = get_databricks_client()
        print("✅ Service client Databricks créé")
        
        # Vérifier la configuration
        is_configured = client.is_configured()
        print(f"🔧 Service configuré: {'✅' if is_configured else '❌'}")
        
        # Obtenir le statut de connexion
        status = client.get_connection_status()
        print(f"🔗 Statut de connexion: {status}")
        
        # Test de connexion
        if is_configured:
            print("🧪 Test de la connexion Databricks...")
            connection_success = client.test_connection()
            if connection_success:
                print("✅ Connexion Databricks réussie!")
            else:
                print("❌ Échec de la connexion Databricks")
                print(f"   Erreur: {status.get('error', 'Unknown error')}")
        
        return is_configured and (not is_configured or connection_success)
        
    except Exception as e:
        print(f"❌ Erreur du service client: {e}")
        return False

def test_genie_service():
    """Tester le service Genie refactorisé."""
    print("\n🧞 Test du service Genie...")
    
    try:
        from app.services.genie import genie_service
        
        # Vérifier la configuration
        is_configured = genie_service._is_configured()
        print(f"🔧 Service Genie configuré: {'✅' if is_configured else '❌'}")
        
        # Obtenir le statut d'authentification
        auth_status = genie_service.get_auth_status()
        print(f"🔐 Statut d'auth Genie: {auth_status.get('is_configured', False)}")
        
        # Afficher les détails de configuration
        print(f"🌐 URL de base: {auth_status.get('base_url', 'Non configurée')}")
        print(f"🎯 Endpoint AgentBricks: {auth_status.get('agentbricks_endpoint', 'Non configuré')}")
        
        return is_configured
        
    except Exception as e:
        print(f"❌ Erreur du service Genie: {e}")
        return False

def test_health_endpoints():
    """Tester les endpoints de santé."""
    print("\n🏥 Test des endpoints de santé...")
    
    try:
        import requests
        import time
        
        # Démarrer le serveur en arrière-plan serait complexe ici
        # Pour l'instant, on teste juste l'import des modules
        from app.api.v1.health import databricks_health_check, _get_health_recommendations
        print("✅ Endpoints de santé importés avec succès")
        
        # Tester la fonction de recommandations
        test_connection_status = {'connected': False, 'auth_method': 'none', 'error': 'Test error'}
        test_genie_status = {'is_configured': False, 'available_env_vars': {}}
        
        recommendations = _get_health_recommendations(test_connection_status, test_genie_status)
        print(f"📋 Recommandations générées: {len(recommendations)} items")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur des endpoints de santé: {e}")
        return False

def print_configuration_summary():
    """Afficher un résumé de la configuration actuelle."""
    print("\n📊 Résumé de la Configuration:")
    print("=" * 50)
    
    # Variables essentielles seulement
    essential_vars = [
        'DATABRICKS_HOST',
        'DATABRICKS_CLIENT_ID', 
        'DATABRICKS_CLIENT_SECRET',
        'DATABRICKS_TOKEN',
        'AGENTBRICKS_ENDPOINT'
    ]
    
    for var in essential_vars:
        value = os.getenv(var, 'NON DÉFINIE')
        if var in ['DATABRICKS_CLIENT_SECRET', 'DATABRICKS_TOKEN'] and value != 'NON DÉFINIE':
            # Masquer les secrets
            value = f"{'*' * 8}...{value[-4:]}" if len(value) > 4 else "***"
        print(f"  {var}: {value}")
    
    # Afficher la méthode d'authentification détectée
    print("\n🔐 Méthode d'authentification détectée:")
    if all(os.getenv(var) for var in ['DATABRICKS_CLIENT_ID', 'DATABRICKS_CLIENT_SECRET']):
        print("  ✅ Service Principal (RECOMMANDÉ)")
    elif os.getenv('DATABRICKS_TOKEN'):
        print("  ⚠️  Token personnel (développement local uniquement)")
    else:
        print("  ❌ Aucune méthode configurée")

def main():
    """Exécuter tous les tests."""
    print("🚀 Test de Configuration Databricks ETRM Data 360")
    print("=" * 60)
    
    # Afficher le résumé de configuration
    print_configuration_summary()
    
    # Exécuter les tests
    tests = [
        ("Variables d'environnement", test_environment_variables),
        ("Imports Databricks", test_databricks_imports),
        ("Service client Databricks", test_databricks_client_service),
        ("Service Genie", test_genie_service),
        ("Endpoints de santé", test_health_endpoints),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Erreur inattendue dans {test_name}: {e}")
            results.append((test_name, False))
    
    # Résumé final
    print("\n🎯 Résultats des Tests:")
    print("=" * 30)
    
    passed = 0
    for test_name, result in results:
        status = "✅ RÉUSSI" if result else "❌ ÉCHOUÉ"
        print(f"  {test_name}: {status}")
        if result:
            passed += 1
    
    total = len(results)
    print(f"\nScore: {passed}/{total} tests réussis")
    
    if passed == total:
        print("\n🎉 Tous les tests sont passés! Configuration prête pour la production.")
        return True
    else:
        print(f"\n⚠️  {total - passed} test(s) ont échoué. Consultez les détails ci-dessus.")
        print("\n💡 Conseils:")
        print("   1. Vérifiez votre fichier .env ou variables d'environnement")
        print("   2. Assurez-vous que le SDK Databricks est installé")
        print("   3. Validez vos identifiants Databricks")
        print("   4. Consultez le guide: instructions/databricks-connection-setup.md")
        return False

if __name__ == "__main__":
    # Charger le fichier .env s'il existe
    try:
        from dotenv import load_dotenv
        env_file = backend_dir / ".env"
        if env_file.exists():
            load_dotenv(env_file)
            print(f"📁 Fichier .env chargé depuis: {env_file}")
        else:
            print("ℹ️  Aucun fichier .env trouvé, utilisation des variables d'environnement système")
    except ImportError:
        print("ℹ️  python-dotenv non disponible, utilisation des variables d'environnement système")
    
    success = main()
    sys.exit(0 if success else 1)
