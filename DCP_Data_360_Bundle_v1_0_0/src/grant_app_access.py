import argparse
import re


IDENTIFIER = re.compile(r"^[A-Za-z0-9_-]+$")


def validate_identifier(value, name):
    if not IDENTIFIER.fullmatch(value):
        raise ValueError(f"Invalid {name}: {value}")
    return value


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--catalog",
        required=True,
    )

    parser.add_argument(
        "--app-service-principal",
        required=True,
    )

    args = parser.parse_args()

    catalog = validate_identifier(
        args.catalog,
        "catalog"
    )

    principal = validate_identifier(
        args.app_service_principal,
        "app service principal"
    )

    principal_sql = f"`{principal}`"
    catalog_sql = f"`{catalog}`"

    spark.sql(
        f"GRANT USE CATALOG "
        f"ON CATALOG {catalog_sql} "
        f"TO {principal_sql}"
    )

    spark.sql(
        f"GRANT USE SCHEMA "
        f"ON SCHEMA {catalog_sql}.`serving` "
        f"TO {principal_sql}"
    )

    spark.sql(
        f"GRANT SELECT "
        f"ON SCHEMA {catalog_sql}.`serving` "
        f"TO {principal_sql}"
    )

    print(
        f"Granted DCP serving access to {principal}"
    )


if __name__ == "__main__":
    main()