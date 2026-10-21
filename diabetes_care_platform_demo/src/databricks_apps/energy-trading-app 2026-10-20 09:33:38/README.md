# ETRM Data 360 — Energy Trading Risk Management Platform

Plateforme moderne de gestion des risques énergétiques alimentée par Databricks, avec un backend FastAPI et un frontend React. Intègre AgentBricks pour l'IA conversationnelle et Unity Catalog pour la gestion des données.

## 🚀 Démarrage Rapide

### Prerequisites
- Python 3.11
- Node.js >= 18
- Accès à un workspace Databricks

### 1) Configuration Databricks

**IMPORTANT :** Cette version intègre complètement Databricks avec authentification sécurisée.

```bash
# Copiez le fichier d'exemple d'environnement
cd backend
cp example.env .env
```

**Configurez vos identifiants Databricks dans `.env` :**

```bash
# Configuration Databricks
DATABRICKS_HOST=https://xxx.cloud.databricks.com

# Option A: Token personnel (pour développement local)
DATABRICKS_TOKEN=your-personal-access-token-here

# Option B: Service Principal (recommandé pour production)
# DATABRICKS_CLIENT_ID=your-client-id-here
# DATABRICKS_CLIENT_SECRET=your-client-secret-here

# Configuration AgentBricks
AGENTBRICKS_ENDPOINT=xxx-endpoint
```

**Testez votre configuration :**
```bash
cd backend
python test_databricks_connection.py
```

### 2) Démarrer le Backend (port 8000)
```bash
cd backend
pip install -r requirements.txt
./run.sh
```
- **API docs :** http://localhost:8000/api/docs  
- **Santé générale :** http://localhost:8000/api/v1/health
- **Santé Databricks :** http://localhost:8000/api/v1/databricks

### 3) Démarrer le Frontend (port 5173)
```bash
cd frontend
npm ci
npm run dev
```
- **Application :** http://localhost:5173
- Le frontend proxie `/api/*` vers `http://localhost:8000`

## 🏗️ Architecture Databricks

### Services Intégrés
- ✅ **AgentBricks** : IA conversationnelle pour les requêtes métier
- ✅ **Unity Catalog** : Gestion centralisée des données
- ✅ **Model Serving** : Endpoints ML pour les prédictions
- ✅ **SQL Warehouse** : Requêtes analytiques performantes

### Authentification
- **Service Principal** (recommandé pour production)
- **Token personnel** (pour développement local)
- **OAuth flow** automatique avec client credentials
- **Fallback** vers CLI Databricks si configuré

## 📊 Données

### Mock Data (Development)
Mock data JSON files sous `infra/local/mock`. Pour régénérer :
```bash
python3 infra/local/mock/generate_mock_data.py
```

### Production Data (Databricks)
Les données de production sont servies directement depuis Unity Catalog via SQL Warehouse.

## 🔧 Configuration Avancée

### Variables d'Environnement Databricks

| Variable | Description | Requis |
|----------|-------------|--------|
| `DATABRICKS_HOST` | URL du workspace | ✅ |
| `DATABRICKS_CLIENT_ID` | Client ID du Service Principal | Recommandé |
| `DATABRICKS_CLIENT_SECRET` | Client Secret du Service Principal | Recommandé |
| `DATABRICKS_TOKEN` | Token personnel d'accès | Alternative |
| `AGENTBRICKS_ENDPOINT` | Endpoint du modèle AgentBricks | ✅ |

### Obtenir les Identifiants

**Token Personnel :**
1. Databricks UI → User Settings → Developer → Access Tokens
2. Générer un nouveau token avec scope `all-apis`

**Service Principal :**
```bash
databricks service-principals create --display-name "ETRM-Data-360-SP"
databricks oauth-secrets create --app-type confidential --service-principal-id <sp-id>
```

## 🚢 Déploiement sur Databricks Apps

### 1. Préparer le Build
```bash
cd frontend
npm ci && npm run build
```

### 2. Configurer l'App
Variables d'environnement à définir dans l'interface Databricks Apps :
- `DATABRICKS_HOST`
- `DATABRICKS_CLIENT_ID` 
- `DATABRICKS_CLIENT_SECRET`
- `AGENTBRICKS_ENDPOINT`

### 3. Déployer
```bash
databricks apps deploy etrm-data-360 \
  --source-code-path /Workspace/Users/your-user/apps/etrm-data-360 \
  --app-yaml-path app.yaml
```

## 📚 Documentation

- **[Guide de Configuration Databricks](instructions/databricks-connection-setup.md)** - Configuration détaillée
- **[Architecture](instructions/architecture.md)** - Vue d'ensemble technique  
- **[Design Patterns](instructions/design-patterns.md)** - Patterns de développement
- **[Sécurité](instructions/security-secrets.md)** - Gestion des secrets

## 🔍 Dépannage

### "Could not get token from Databricks CLI"
Vérifiez vos variables d'environnement :
```bash
echo $DATABRICKS_HOST
echo $DATABRICKS_TOKEN  # ou CLIENT_ID/CLIENT_SECRET
```

### Test de Connectivité
```bash
cd backend
python test_databricks_connection.py
```

### Points de Contrôle de Santé
- **Backend :** http://localhost:8000/api/v1/health
- **Databricks :** http://localhost:8000/api/v1/databricks

## 🎯 Features Principales

- 📈 **Trading Dashboard** : Visualisation temps réel des positions
- ⚠️ **Risk Management** : Monitoring VaR et limites d'exposition  
- 📊 **Analytics** : Analyses de scénarios et stress tests
- 🤖 **AI Assistant** : Chat intelligent avec AgentBricks
- 📱 **Responsive UI** : Interface moderne et adaptative

## 🛠️ Technologies

- **Backend :** FastAPI, Databricks SDK, Pydantic
- **Frontend :** React 18, Vite, TailwindCSS, Recharts  
- **Data :** Databricks Unity Catalog, Delta Lake
- **AI :** AgentBricks, Model Serving
- **Deployment :** Databricks Apps, Gunicorn
