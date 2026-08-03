#!/bin/sh
set -eu

MINIO_ALIAS="local"
MINIO_INTERNAL_URL="http://minio:9000"

mc alias set "$MINIO_ALIAS" "$MINIO_INTERNAL_URL" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb --ignore-existing "$MINIO_ALIAS/$MINIO_BUCKET"
mc anonymous set none "$MINIO_ALIAS/$MINIO_BUCKET"
mc ready "$MINIO_ALIAS"
