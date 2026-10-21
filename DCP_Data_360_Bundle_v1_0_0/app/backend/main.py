import os
from pathlib import Path
from typing import Any

import uvicorn

from databricks import sql
from databricks.sdk import WorkspaceClient

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles


# =====================================================================
# Application
# =====================================================================

app = FastAPI(
    title="DCP Data 360",
    version="1.0.0",
    description="Diabetes Care Platform Data 360 API",
)


# =====================================================================
# Application paths
# =====================================================================

APP_ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = APP_ROOT / "static"
ASSETS_DIR = STATIC_DIR / "assets"

if not STATIC_DIR.is_dir():
    raise RuntimeError(
        f"Static directory not found: {STATIC_DIR}"
    )

if not ASSETS_DIR.is_dir():
    raise RuntimeError(
        f"Assets directory not found: {ASSETS_DIR}"
    )

app.mount(
    "/assets",
    StaticFiles(directory=str(ASSETS_DIR)),
    name="assets",
)


# =====================================================================
# Runtime configuration
# =====================================================================

DATABRICKS_HOST = os.environ["DATABRICKS_HOST"]

DATABRICKS_WAREHOUSE_ID = os.environ[
    "DATABRICKS_WAREHOUSE_ID"
]

DATABRICKS_APP_PORT = int(
    os.environ["DATABRICKS_APP_PORT"]
)

DCP_CATALOG = os.environ["DCP_CATALOG"]

DCP_SERVING_SCHEMA = os.getenv(
    "DCP_SERVING_SCHEMA",
    "serving",
)


# =====================================================================
# Databricks authentication
# =====================================================================

workspace_client = WorkspaceClient()


def get_access_token() -> str:
    """
    Request an OAuth authorization header using the
    Databricks App service-principal identity.
    """

    headers = workspace_client.config.authenticate()

    authorization = headers.get("Authorization")

    if not authorization:
        raise RuntimeError(
            "Databricks authentication returned "
            "no Authorization header"
        )

    prefix = "Bearer "

    if not authorization.startswith(prefix):
        raise RuntimeError(
            "Unexpected Databricks "
            "Authorization header format"
        )

    return authorization[len(prefix):]


# =====================================================================
# SQL Warehouse connectivity
# =====================================================================

def get_sql_connection():
    server_hostname = (
        DATABRICKS_HOST
        .replace("https://", "")
        .replace("http://", "")
        .rstrip("/")
    )

    http_path = (
        f"/sql/1.0/warehouses/"
        f"{DATABRICKS_WAREHOUSE_ID}"
    )

    return sql.connect(
        server_hostname=server_hostname,
        http_path=http_path,
        access_token=get_access_token(),
    )


def execute_query(
    statement: str,
    parameters: tuple[Any, ...] | None = None,
) -> list[dict[str, Any]]:
    connection = None
    cursor = None

    try:
        connection = get_sql_connection()
        cursor = connection.cursor()

        if parameters:
            cursor.execute(
                statement,
                parameters,
            )
        else:
            cursor.execute(statement)

        if cursor.description is None:
            return []

        columns = [
            column[0]
            for column in cursor.description
        ]

        rows = cursor.fetchall()

        return [
            dict(zip(columns, row))
            for row in rows
        ]

    finally:

        if cursor is not None:
            cursor.close()

        if connection is not None:
            connection.close()


# =====================================================================
# Unity Catalog identifiers
# =====================================================================

SERVING_OBJECTS = {
    "patient_selector":
        "v_patient_selector",

    "patient_cities":
        "v_patient_cities",

    "glucose_timeline":
        "v_glucose_timeline",

    "nutrition_comparison":
        "v_nutrition_comparison",

    "source_health":
        "v_source_health",
}


def serving_object(key: str) -> str:
    """
    Only identifiers controlled by application code
    can be resolved here.
    """

    table = SERVING_OBJECTS.get(key)

    if table is None:
        raise ValueError(
            f"Unknown serving object: {key}"
        )

    return (
        f"`{DCP_CATALOG}`."
        f"`{DCP_SERVING_SCHEMA}`."
        f"`{table}`"
    )


# =====================================================================
# Basic health
# =====================================================================

@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "dcp-data-360",
        "catalog": DCP_CATALOG,
        "serving_schema": DCP_SERVING_SCHEMA,
        "warehouse_configured":
            bool(DATABRICKS_WAREHOUSE_ID),
    }


# =====================================================================
# Databricks connectivity health
# =====================================================================

@app.get("/api/health/databricks")
def databricks_health():

    try:
        result = execute_query(
            """
            SELECT
                current_user() AS current_user,
                current_catalog() AS current_catalog
            """
        )

        return {
            "status": "ok",
            "result": result,
        }

    except Exception as exc:

        # Detailed error remains in server logs.
        print(
            "Databricks connectivity check failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=503,
            detail="Databricks SQL is unavailable",
        ) from exc


# =====================================================================
# Patients
# =====================================================================

@app.get("/api/patients")
def patients(
    limit: int = Query(
        default=100,
        ge=1,
        le=1000,
    ),
):

    statement = f"""
        SELECT patient_id
        FROM {serving_object("patient_selector")}
        ORDER BY patient_id
        LIMIT {limit}
    """

    try:
        return {
            "items": execute_query(statement),
        }

    except Exception as exc:

        print(
            "Patient selector query failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load patients",
        ) from exc


# =====================================================================
# Patient residence / cities
# =====================================================================

@app.get("/api/patients/{patient_id}/cities")
def patient_cities(
    patient_id: str,
):

    statement = f"""
        SELECT
            patient_id,
            city_id,
            country_code,
            valid_from,
            valid_to,
            residence_status,
            synthetic_flag,
            run_id
        FROM {serving_object("patient_cities")}
        WHERE patient_id = ?
        ORDER BY valid_from DESC
    """

    try:
        return {
            "patient_id": patient_id,
            "items": execute_query(
                statement,
                (patient_id,),
            ),
        }

    except Exception as exc:

        print(
            "Patient cities query failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load patient cities",
        ) from exc


# =====================================================================
# Glucose timeline
# =====================================================================

@app.get("/api/patients/{patient_id}/glucose")
def glucose_timeline(
    patient_id: str,
    limit: int = Query(
        default=500,
        ge=1,
        le=5000,
    ),
):

    statement = f"""
        SELECT
            patient_id,
            reading_ts,
            glucose_mmol_l,
            city_id
        FROM {serving_object("glucose_timeline")}
        WHERE patient_id = ?
        ORDER BY reading_ts
        LIMIT {limit}
    """

    try:
        return {
            "patient_id": patient_id,
            "items": execute_query(
                statement,
                (patient_id,),
            ),
        }

    except Exception as exc:

        print(
            "Glucose timeline query failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load glucose timeline",
        ) from exc


# =====================================================================
# Nutrition comparison
# =====================================================================

@app.get("/api/patients/{patient_id}/nutrition")
def nutrition_comparison(
    patient_id: str,
):

    statement = f"""
        SELECT
            patient_id,
            city_id,
            food_category,
            patient_events,
            city_benchmark
        FROM {serving_object("nutrition_comparison")}
        WHERE patient_id = ?
        ORDER BY
            city_id,
            food_category
    """

    try:
        return {
            "patient_id": patient_id,
            "items": execute_query(
                statement,
                (patient_id,),
            ),
        }

    except Exception as exc:

        print(
            "Nutrition comparison query failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load nutrition comparison",
        ) from exc


# =====================================================================
# Source health
# =====================================================================

@app.get("/api/source-health")
def source_health():

    statement = f"""
        SELECT
            dataset,
            record_count,
            last_event_ts
        FROM {serving_object("source_health")}
        ORDER BY dataset
    """

    try:
        return {
            "items": execute_query(statement),
        }

    except Exception as exc:

        print(
            "Source health query failed:",
            repr(exc),
        )

        raise HTTPException(
            status_code=500,
            detail="Unable to load source health",
        ) from exc


# =====================================================================
# Frontend
# =====================================================================

@app.get("/")
def frontend():

    index_file = STATIC_DIR / "index.html"

    if not index_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Frontend not found",
        )

    return FileResponse(
        str(index_file)
    )


# =====================================================================
# Databricks Apps entry point
# =====================================================================

if __name__ == "__main__":

    print(
        f"Starting DCP Data 360 on "
        f"0.0.0.0:{DATABRICKS_APP_PORT}"
    )

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=DATABRICKS_APP_PORT,
    )