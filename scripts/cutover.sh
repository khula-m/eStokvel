#!/bin/bash
# ============================================================================
# eStokvel Deployment Cutover Script
# ============================================================================
# Executes the migration from Railway monolith to K8s.
# Run each step manually and verify before proceeding.
# ============================================================================
set -euo pipefail

NAMESPACE="estokvel"
REGISTRY="ghcr.io/khula-m/estokvel/estokvel-backend"

echo "============================================"
echo "  eStokvel Cutover: Railway → Kubernetes"
echo "============================================"
echo ""

# ── Step 0: Pre-flight checks ──
step_preflight() {
    echo "── Step 0: Pre-flight checks ──"
    echo ""

    # Check kubectl connected
    if ! kubectl cluster-info > /dev/null 2>&1; then
        echo "ERROR: kubectl not connected to a cluster"
        echo "Run: export KUBECONFIG=/path/to/kubeconfig.yaml"
        exit 1
    fi
    echo "✓ kubectl connected"

    # Check namespace
    if kubectl get namespace "$NAMESPACE" > /dev/null 2>&1; then
        echo "✓ Namespace '$NAMESPACE' exists"
    else
        echo "Creating namespace..."
        kubectl apply -f k8s/namespace.yaml
    fi

    # Check secrets exist
    if kubectl get secret estokvel-secrets -n "$NAMESPACE" > /dev/null 2>&1; then
        echo "✓ Secrets configured"
    else
        echo "ERROR: estokvel-secrets not found"
        echo "Create with: kubectl create secret generic estokvel-secrets -n $NAMESPACE \\"
        echo "  --from-literal=DATABASE_URL='your-database-url' \\"
        echo "  --from-literal=JWT_SECRET='your-jwt-secret' \\"
        echo "  --from-literal=OZOW_SITE_CODE='...' \\"
        echo "  --from-literal=OZOW_PRIVATE_KEY='...' \\"
        echo "  --from-literal=OZOW_API_KEY='...'"
        exit 1
    fi

    echo ""
    echo "Pre-flight checks passed!"
}

# ── Step 1: Deploy infrastructure ──
step_infra() {
    echo "── Step 1: Deploy infrastructure ──"
    kubectl apply -f k8s/namespace.yaml
    kubectl apply -f k8s/config.yaml
    kubectl apply -f k8s/database-config.yaml
    kubectl apply -f k8s/redis.yaml

    echo "Waiting for Redis..."
    kubectl rollout status deployment/redis -n "$NAMESPACE" --timeout=120s || \
    kubectl rollout status statefulset/redis -n "$NAMESPACE" --timeout=120s || true

    echo ""
    echo "✓ Infrastructure deployed"
}

# ── Step 2: Deploy monolith ──
step_monolith() {
    echo "── Step 2: Deploy monolith ──"
    kubectl apply -f k8s/monolith.yaml

    echo "Waiting for rollout..."
    kubectl rollout status deployment/monolith -n "$NAMESPACE" --timeout=300s

    echo ""
    echo "Pods:"
    kubectl get pods -n "$NAMESPACE" -l component=monolith
    echo ""
    echo "✓ Monolith deployed"
}

# ── Step 3: Internal health check ──
step_healthcheck() {
    echo "── Step 3: Health check (port-forward) ──"
    kubectl port-forward svc/monolith 8080:80 -n "$NAMESPACE" &
    PF_PID=$!
    sleep 5

    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health)
    kill $PF_PID 2>/dev/null || true

    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✓ Health check passed (HTTP $HTTP_STATUS)"
    else
        echo "✗ Health check FAILED (HTTP $HTTP_STATUS)"
        echo "Check logs: kubectl logs -l component=monolith -n $NAMESPACE"
        exit 1
    fi
}

# ── Step 4: Deploy ingress ──
step_ingress() {
    echo "── Step 4: Deploy ingress ──"
    kubectl apply -f k8s/ingress.yaml

    echo ""
    echo "Ingress status:"
    kubectl get ingress -n "$NAMESPACE"
    echo ""
    echo "✓ Ingress deployed"
    echo ""
    echo "NEXT: Update DNS to point api.estokvel.co.za to the ingress IP above"
    echo "Load balancer IP:"
    kubectl get svc -n ingress-nginx -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}' 2>/dev/null || \
    echo "(ingress-nginx not found — install it first)"
}

# ── Step 5: Verify external access ──
step_verify_external() {
    echo "── Step 5: Verify external access ──"
    echo "Testing https://api.estokvel.co.za/health ..."

    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 https://api.estokvel.co.za/health 2>/dev/null || echo "000")

    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✓ External access working (HTTP $HTTP_STATUS)"
        echo ""
        echo "CUTOVER COMPLETE!"
        echo "Railway can be kept as backup for 1 week, then decommissioned."
    else
        echo "✗ External access failed (HTTP $HTTP_STATUS)"
        echo "Check DNS propagation with: dig api.estokvel.co.za"
        echo "Check TLS cert: kubectl describe certificate -n $NAMESPACE"
    fi
}

# ── Menu ──
echo "Select step to run:"
echo "  0) Pre-flight checks"
echo "  1) Deploy infrastructure (Redis, configs)"
echo "  2) Deploy monolith (2 replicas)"
echo "  3) Health check (internal port-forward)"
echo "  4) Deploy ingress (TLS)"
echo "  5) Verify external access"
echo "  all) Run all steps sequentially"
echo "  rollback) Rollback monolith to previous version"
echo ""
read -rp "Step: " choice

case "$choice" in
    0) step_preflight ;;
    1) step_infra ;;
    2) step_monolith ;;
    3) step_healthcheck ;;
    4) step_ingress ;;
    5) step_verify_external ;;
    all)
        step_preflight
        echo ""; echo "─────────────────────"; echo ""
        step_infra
        echo ""; echo "─────────────────────"; echo ""
        step_monolith
        echo ""; echo "─────────────────────"; echo ""
        step_healthcheck
        echo ""; echo "─────────────────────"; echo ""
        step_ingress
        echo ""; echo "─────────────────────"; echo ""
        step_verify_external
        ;;
    rollback)
        echo "Rolling back monolith deployment..."
        kubectl rollout undo deployment/monolith -n "$NAMESPACE"
        kubectl rollout status deployment/monolith -n "$NAMESPACE" --timeout=120s
        echo "✓ Rollback complete"
        kubectl get pods -n "$NAMESPACE" -l component=monolith
        ;;
    *)
        echo "Invalid choice. Pass 0-5, 'all', or 'rollback'."
        exit 1
        ;;
esac
