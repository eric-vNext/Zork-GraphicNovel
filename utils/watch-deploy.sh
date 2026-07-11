#!/usr/bin/env bash
# Watch the most recent GitHub Actions "Deploy to GitHub Pages" run for the
# current (or given) branch until it finishes, and fail loudly if it fails.
# Requires `gh` to be authenticated for this repo.
#
# Usage: utils/watch-deploy.sh [branch]
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')
if [ -z "$RUN_ID" ]; then
  echo "No workflow runs found for branch $BRANCH" >&2
  exit 1
fi

echo "Watching run $RUN_ID on branch $BRANCH..."
gh run watch "$RUN_ID" --exit-status
