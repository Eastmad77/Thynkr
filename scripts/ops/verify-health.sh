#!/usr/bin/env bash
set -euo pipefail
URL="${1:-https://YOUR-SITE.netlify.app/health}"
echo "Pinging $URL ..."
code=$(curl -s -o /tmp/health.json -w "%{http_code}" "$URL")
echo "HTTP $code"
cat /tmp/health.json || true
if [ "$code" -ne 200 ]; then
  echo "❌ Health check failed"
  exit 1
fi
lat=$(jq '.latencyMs' /tmp/health.json 2>/dev/null || echo 9999)
if [ "$lat" -gt 800 ]; then
  echo "⚠️ High latency: ${lat}ms"
else
  echo "✅ OK: ${lat}ms"
fi
