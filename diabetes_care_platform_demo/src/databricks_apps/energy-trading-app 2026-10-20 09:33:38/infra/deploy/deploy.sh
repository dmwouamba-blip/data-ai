# from repo root
set -euo pipefail

# optional: ensure python 3.11 venv locally
python3.11 -m venv .venv || true
source .venv/bin/activate || true
pip install -r requirements.txt || true

# create and deploy app
export APP_NAME="energy-trading-app"
# workspace path to upload source (note: use /Users, not /Workspace/Users)
export DATABRICKS_WS_PATH="/Workspace/Demo Assets/Energy_Utilities/Energy Trading/etrm-data-360"
export DATABRICKS_PROFILE="sevann-indus-demo"

# build frontend so FastAPI can serve dist/
# Force clean build every time to ensure latest changes are included
echo "🔄 Building frontend with latest changes..."
(cd frontend && rm -rf dist/ node_modules/.vite && npm ci && npm run build)
echo "✅ Frontend build completed"

# install and auth CLI if needed
pip install -U databricks-cli
# databricks configure --token   # run once if not configured

echo "📁 Creating workspace directory..."
databricks workspace mkdirs "$DATABRICKS_WS_PATH" --profile "$DATABRICKS_PROFILE"

echo "🔄 Synchronizing code to Databricks workspace..."
# Force full sync to ensure all changes are uploaded
databricks sync --full . "$DATABRICKS_WS_PATH" --profile "$DATABRICKS_PROFILE"
echo "✅ Code synchronization completed"


echo "🔍 Checking if app exists..."
if ! databricks apps list --profile "$DATABRICKS_PROFILE" | grep -q "$APP_NAME"; then
    echo "📱 Creating app '$APP_NAME'..."
    databricks apps create "$APP_NAME" --profile "$DATABRICKS_PROFILE"
    echo "✅ App created successfully"
else
    echo "✅ App '$APP_NAME' already exists"
fi

echo "🚀 Deploying app..."
databricks apps deploy "$APP_NAME" --source-code-path "$DATABRICKS_WS_PATH" --profile "$DATABRICKS_PROFILE"
echo "✅ App deployment completed"