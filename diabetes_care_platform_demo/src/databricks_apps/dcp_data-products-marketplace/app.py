import os
import json
import streamlit as st
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.catalog import CatalogInfo, SchemaInfo

# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="Databricks Data Marketplace",
    page_icon="🛒",
    layout="wide",
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

@st.cache_resource
def get_workspace_client() -> WorkspaceClient:
    """Return a WorkspaceClient authenticated via the App's service principal."""
    return WorkspaceClient()


def list_catalogs(w: WorkspaceClient) -> list[str]:
    """Return all catalog names the caller can see."""
    return [c.name for c in w.catalogs.list()]


def list_schemas(w: WorkspaceClient, catalog: str) -> list[str]:
    """Return all schema names inside *catalog*."""
    return [s.name for s in w.schemas.list(catalog_name=catalog)]


def list_tables(w: WorkspaceClient, catalog: str, schema: str) -> list[dict]:
    """Return table summaries for catalog.schema."""
    tables = []
    for t in w.tables.list(catalog_name=catalog, schema_name=schema):
        tables.append({
            "full_name": t.full_name,
            "name": t.name,
            "catalog": catalog,
            "schema": schema,
            "table_type": t.table_type or "UNKNOWN",
            "comment": t.comment or "",
            "columns": [
                {"name": c.name, "type": c.type_name or "", "comment": c.comment or ""}
                for c in (t.columns or [])
            ],
            "created_at": str(t.created_at) if t.created_at else "",
            "updated_at": str(t.updated_at) if t.updated_at else "",
        })
    return tables


def format_size_str(val) -> str:
    """Best-effort human-readable size."""
    if val is None:
        return "—"
    try:
        n = float(val)
        for unit in ["B", "KB", "MB", "GB", "TB"]:
            if n < 1024:
                return f"{n:.1f} {unit}"
            n /= 1024
        return f"{n:.1f} PB"
    except Exception:
        return str(val)


# ---------------------------------------------------------------------------
# Session state  – tracks cart / access requests
# ---------------------------------------------------------------------------
if "cart" not in st.session_state:
    st.session_state.cart = []

# ---------------------------------------------------------------------------
# Sidebar — navigation
# ---------------------------------------------------------------------------
st.sidebar.title("🛒 Data Marketplace")
st.sidebar.caption("Browse, inspect, and request access to Unity Catalog data products.")

page = st.sidebar.radio("Navigate", ["Browse Catalogs", "My Cart", "About"], index=0)

w = get_workspace_client()

# ---------------------------------------------------------------------------
# Page 1 — Browse Catalogs
# ---------------------------------------------------------------------------
if page == "Browse Catalogs":
    st.header("🔎 Browse Data Products")

    # --- catalog + schema selectors ---
    col_cat, col_sch = st.columns(2)

    with col_cat:
        catalogs = list_catalogs(w)
        # filter out system catalogs by default
        user_catalogs = [c for c in catalogs if not c.startswith("__")]
        selected_catalog = st.selectbox("Catalog", user_catalogs, index=0)

    with col_sch:
        schemas = list_schemas(w, selected_catalog) if selected_catalog else []
        selected_schema = st.selectbox("Schema", schemas, index=0) if schemas else None

    if not selected_schema:
        st.info("Select a schema to list its tables.")
        st.stop()

    # --- fetch tables ---
    tables = list_tables(w, selected_catalog, selected_schema)

    if not tables:
        st.warning(f"No tables found in `{selected_catalog}.{selected_schema}`.")
        st.stop()

    st.subheader(f"Tables in `{selected_catalog}.{selected_schema}` ({len(tables)})")

    # --- search box ---
    search_term = st.text_input("🔍 Filter tables by name", "", placeholder="Type to search…")

    filtered = [t for t in tables if search_term.lower() in t["name"].lower()]

    # --- table cards ---
    for tbl in filtered:
        with st.container(border=True):
            col1, col2, col3 = st.columns([5, 2, 2])

            with col1:
                st.markdown(f"### `{tbl['full_name']}`")
                if tbl["comment"]:
                    st.caption(tbl["comment"])
                else:
                    st.caption("_No description_")

            with col2:
                st.metric("Type", tbl["table_type"])
                st.metric("Columns", len(tbl["columns"]))

            with col3:
                in_cart = any(
                    item["full_name"] == tbl["full_name"]
                    for item in st.session_state.cart
                )
                if in_cart:
                    st.success("✅ In Cart")
                    if st.button("Remove", key=f"rm_{tbl['full_name']}"):
                        st.session_state.cart = [
                            i for i in st.session_state.cart
                            if i["full_name"] != tbl["full_name"]
                        ]
                        st.rerun()
                else:
                    if st.button("Request Access", key=f"add_{tbl['full_name']}"):
                        st.session_state.cart.append({
                            "full_name": tbl["full_name"],
                            "catalog": tbl["catalog"],
                            "schema": tbl["schema"],
                            "name": tbl["name"],
                            "table_type": tbl["table_type"],
                            "columns": tbl["columns"],
                            "comment": tbl["comment"],
                        })
                        st.rerun()

            # expandable column details
            with st.expander(f"Columns ({len(tbl['columns'])})"):
                if tbl["columns"]:
                    import pandas as pd
                    df_cols = pd.DataFrame(tbl["columns"])
                    st.dataframe(df_cols, use_container_width=True, hide_index=True)
                else:
                    st.write("_No column metadata available._")

# ---------------------------------------------------------------------------
# Page 2 — My Cart (access requests)
# ---------------------------------------------------------------------------
elif page == "My Cart":
    st.header("🛒 My Access Requests")

    cart = st.session_state.cart

    if not cart:
        st.info("Your cart is empty. Browse catalogs and add tables to request access.")
    else:
        st.subheader(f"{len(cart)} item(s) in your cart")

        for item in cart:
            with st.container(border=True):
                col1, col2 = st.columns([6, 1])
                with col1:
                    st.markdown(f"### `{item['full_name']}`")
                    st.caption(f"Type: {item['table_type']} · Columns: {len(item['columns'])}")
                    if item["comment"]:
                        st.write(item["comment"])
                with col2:
                    if st.button("Remove", key=f"cart_rm_{item['full_name']}"):
                        st.session_state.cart = [
                            i for i in st.session_state.cart
                            if i["full_name"] != item["full_name"]
                        ]
                        st.rerun()

        # --- justification + export ---
        st.divider()
        justification = st.text_area(
            "Justification for access request",
            placeholder="Explain why you need access to these tables…",
        )

        col_exp, col_clear = st.columns(2)
        with col_exp:
            if st.button("📄 Export Request as JSON", type="primary"):
                request_payload = {
                    "user": os.environ.get("DATABRICKS_APP_USER", "unknown"),
                    "justification": justification,
                    "tables": [
                        {
                            "full_name": i["full_name"],
                            "table_type": i["table_type"],
                            "columns": i["columns"],
                        }
                        for i in cart
                    ],
                }
                st.download_button(
                    label="Download JSON",
                    data=json.dumps(request_payload, indent=2),
                    file_name="access_request.json",
                    mime="application/json",
                )
                st.success("Request exported! Share this with your data steward.")

        with col_clear:
            if st.button("🗑️ Clear Cart"):
                st.session_state.cart = []
                st.rerun()

# ---------------------------------------------------------------------------
# Page 3 — About
# ---------------------------------------------------------------------------
elif page == "About":
    st.header("About this App")
    st.write("""
    This **Data Marketplace** app is a sample Databricks App built with Streamlit.

    **Features:**
    * Browse all Unity Catalog tables across catalogs and schemas
    * Inspect table metadata (columns, types, comments)
    * Add tables to a cart and generate an access-request JSON
    * Search and filter tables by name

    **How it works:**
    * Uses the Databricks SDK for Python (`databricks-sdk`) to list catalogs, schemas, and tables
    * Authenticates automatically as the App's service principal
    * No hardcoded credentials — inherits the App's identity

    **Customisation ideas:**
    * Integrate with your governance workflow to auto-create GRANT statements
    * Add data-quality metrics from `system.information_schema`
    * Show table lineage and popular queries
    * Rate / favourite tables and persist to a UC table
    """)