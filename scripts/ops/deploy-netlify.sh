#!/usr/bin/env bash
set -euo pipefail
# Requires Netlify CLI logged in (`netlify login`)
# Usage: ./scripts/ops/deploy-netlify.sh prod|draft

TARGET="${1:-prod}"

echo "Ensuring required files exist..."
test -f netlify.toml
test -f deploy/deploy-manifest.json

if [ "$TARGET" = "prod" ]; then
  echo "🚀 Deploying to Netlify production..."
  netlify deploy --prod --dir .
else
  echo "🧪 Deploying draft preview..."
  netlify deploy --dir .
fi

echo "Done."
