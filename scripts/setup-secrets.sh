#!/bin/bash
# ============================================================================
# eStokvel K8s Secrets Setup
# ============================================================================
# Run once to create the required secrets in your K8s cluster.
# Replace placeholder values with your actual credentials.
# ============================================================================
set -euo pipefail

NAMESPACE="estokvel"

echo "Creating eStokvel K8s secrets..."

# ── Application secrets ──
kubectl create secret generic estokvel-secrets -n "$NAMESPACE" \
  --from-literal=DATABASE_URL="${DATABASE_URL:?Set DATABASE_URL}" \
  --from-literal=JWT_SECRET="${JWT_SECRET:?Set JWT_SECRET}" \
  --from-literal=OZOW_SITE_CODE="${OZOW_SITE_CODE:-}" \
  --from-literal=OZOW_PRIVATE_KEY="${OZOW_PRIVATE_KEY:-}" \
  --from-literal=OZOW_API_KEY="${OZOW_API_KEY:-}" \
  --from-literal=AT_API_KEY="${AT_API_KEY:-}" \
  --from-literal=AT_USERNAME="${AT_USERNAME:-sandbox}" \
  --dry-run=client -o yaml | kubectl apply -f -

echo "✓ estokvel-secrets created/updated"

# ── Container registry credentials ──
if [ -n "${GHCR_TOKEN:-}" ]; then
  kubectl create secret docker-registry ghcr-credentials -n "$NAMESPACE" \
    --docker-server=ghcr.io \
    --docker-username="${GITHUB_USER:?Set GITHUB_USER}" \
    --docker-password="$GHCR_TOKEN" \
    --dry-run=client -o yaml | kubectl apply -f -
  echo "✓ ghcr-credentials created/updated"
else
  echo "⚠ Skipping ghcr-credentials (set GHCR_TOKEN to create)"
fi

# ── Database credentials (for backup CronJobs) ──
if [ -n "${DB_HOST:-}" ]; then
  kubectl create secret generic database-credentials -n "$NAMESPACE" \
    --from-literal=host="$DB_HOST" \
    --from-literal=port="${DB_PORT:-5432}" \
    --from-literal=username="${DB_USER:-postgres}" \
    --from-literal=password="${DB_PASSWORD:?Set DB_PASSWORD}" \
    --from-literal=database="${DB_NAME:-railway}" \
    --dry-run=client -o yaml | kubectl apply -f -
  echo "✓ database-credentials created/updated"
else
  echo "⚠ Skipping database-credentials (set DB_HOST to create)"
fi

echo ""
echo "Done! Verify with:"
echo "  kubectl get secrets -n $NAMESPACE"
