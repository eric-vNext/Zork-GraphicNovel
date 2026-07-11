#!/usr/bin/env bash
# Run the full local verification pass before committing/pushing game changes:
# typecheck, unit tests, production build. Mirrors what .github/workflows/deploy.yml
# runs in CI, so a clean local run means the deploy job will pass too.
#
# Usage: utils/verify.sh
set -euo pipefail
cd "$(dirname "$0")/../game"

echo "== typecheck =="
npx tsc --noEmit

echo "== tests =="
npx vitest run

echo "== production build =="
npm run build

echo "== all checks passed =="
