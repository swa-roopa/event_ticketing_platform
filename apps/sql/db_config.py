"""
Secrets Manager integration for GlobalTix.
Fetches database credentials from AWS Secrets Manager with caching.
"""

import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger("globaltix.secrets")


class SecretsManager:
    """
    Fetches and caches secrets from AWS Secrets Manager.
    Automatically uses the local region's replica for low latency.
    """

    def __init__(self, secret_name: str, region: str = None):
        self.secret_name = secret_name
        self.region = region or os.getenv("AWS_REGION", "us-east-1")
        self._client = None
        self._cache = {}
        self._cache_expiry = {}
        self._cache_ttl = timedelta(minutes=5)

    @property
    def client(self):
        if self._client is None:
            self._client = boto3.client(
                "secretsmanager",
                region_name=self.region
            )
        return self._client

    def get_secret(self, force_refresh: bool = False) -> dict:
        """
        Get secret value with caching.

        Args:
            force_refresh: Bypass cache and fetch fresh value

        Returns:
            Dictionary containing secret values
        """
        cache_key = f"{self.region}:{self.secret_name}"

        # Check cache
        if not force_refresh and cache_key in self._cache:
            if datetime.now(timezone.utc) < self._cache_expiry.get(cache_key, datetime.min.replace(tzinfo=timezone.utc)):
                logger.debug(f"Returning cached secret for {self.secret_name}")
                return self._cache[cache_key]

        # Fetch from Secrets Manager
        try:
            logger.info(f"Fetching secret {self.secret_name} from region {self.region}")
            response = self.client.get_secret_value(SecretId=self.secret_name)

            if "SecretString" in response:
                secret_data = json.loads(response["SecretString"])
            else:
                raise ValueError("Binary secrets not supported")

            # Update cache
            self._cache[cache_key] = secret_data
            self._cache_expiry[cache_key] = datetime.now(timezone.utc) + self._cache_ttl

            return secret_data

        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code")

            if error_code == "ResourceNotFoundException":
                logger.error(f"Secret {self.secret_name} not found in region {self.region}")
            elif error_code == "AccessDeniedException":
                logger.error(f"Access denied to secret {self.secret_name}. Check IAM permissions.")
            else:
                logger.error(f"Error fetching secret: {e}")

            raise

    def get_db_credentials(self) -> dict:
        """
        Get database credentials structured for connection.

        Returns:
            Dict with host, port, database, user, password for current region
        """
        secret = self.get_secret()
        current_region = os.getenv("AWS_REGION", "us-east-1")

        # Determine which endpoint to use based on region
        if current_region == "us-east-1":
            host = secret.get("primary_writer_endpoint", secret.get("host"))
        else:
            host = secret.get("secondary_writer_endpoint", secret.get("host"))

        return {
            "host": host,
            "port": secret.get("port", 3306),
            "database": secret.get("dbname", "globaltix"),
            "user": secret.get("username"),
            "password": secret.get("password"),
        }

    def get_all_endpoints(self) -> dict:
        """Get all database endpoints from secret"""
        secret = self.get_secret()

        return {
            "primary": {
                "writer": secret.get("primary_writer_endpoint"),
                "reader": secret.get("primary_reader_endpoint"),
            },
            "secondary": {
                "writer": secret.get("secondary_writer_endpoint"),
                "reader": secret.get("secondary_reader_endpoint"),
            }
        }


# Singleton instance
_secrets_manager: Optional[SecretsManager] = None


def get_secrets_manager() -> SecretsManager:
    """Get or create the secrets manager singleton"""
    global _secrets_manager

    if _secrets_manager is None:
        secret_name = os.getenv("DB_SECRET_NAME", "globaltix/database/credentials")
        region = os.getenv("AWS_REGION", "us-east-1")
        _secrets_manager = SecretsManager(secret_name, region)

    return _secrets_manager


def get_db_config() -> dict:
    """
    Get database configuration from Secrets Manager or environment variables.
    Falls back to environment variables for local development.
    """
    # Check if we should use Secrets Manager
    use_secrets_manager = os.getenv("USE_SECRETS_MANAGER", "true").lower() == "true"

    if use_secrets_manager:
        try:
            sm = get_secrets_manager()
            return sm.get_db_credentials()
        except Exception as e:
            logger.warning(f"Failed to get credentials from Secrets Manager: {e}")
            logger.warning("Falling back to environment variables")

    # Fallback to environment variables (for local development)
    current_region = os.getenv("AWS_REGION", "us-east-1")

    if current_region == "us-east-1":
        host = os.getenv("PRIMARY_DB_HOST", "localhost")
    else:
        host = os.getenv("SECONDARY_DB_HOST", "localhost")

    return {
        "host": host,
        "port": int(os.getenv("DB_PORT", "3306")),
        "database": os.getenv("DB_NAME", "globaltix"),
        "user": os.getenv("DB_USER", "globaltix_admin"),
        "password": os.getenv("DB_PASSWORD", ""),
    }


def get_all_db_endpoints() -> dict:
    """
    Get all database endpoints from Secrets Manager or environment variables.
    """
    use_secrets_manager = os.getenv("USE_SECRETS_MANAGER", "true").lower() == "true"

    if use_secrets_manager:
        try:
            sm = get_secrets_manager()
            return sm.get_all_endpoints()
        except Exception as e:
            logger.warning(f"Failed to get endpoints from Secrets Manager: {e}")

    # Fallback to environment variables
    return {
        "primary": {
            "writer": os.getenv("PRIMARY_DB_HOST", "localhost"),
            "reader": os.getenv("PRIMARY_DB_HOST", "localhost"),
        },
        "secondary": {
            "writer": os.getenv("SECONDARY_DB_HOST", "localhost"),
            "reader": os.getenv("SECONDARY_DB_HOST", "localhost"),
        }
    }
