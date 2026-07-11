#!/usr/bin/env bash
# Watch the most recent GitHub Actions "Deploy to GitHub Pages" run for the
# current (or given) branch until it finishes, and fail loudly if it fails.
# Requires `gh` to be authenticated for this repo.
#
# Usage: utils/watch-deploy.sh [branch]
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="${1:-$(git rev-parse --abbrev-ref HEAD)}"

# Right after `git push`, GitHub can take a few seconds to register the new
# run — a bare "latest run" query can grab the previous (already-completed)
# run instead. Poll briefly for one that's still queued/in_progress; fall
# back to whatever is latest if none shows up in time.
RUN_ID=""
for _ in $(seq 1 10); do
  RUN_ID=$(gh run list --branch "$BRANCH" --status queued --status in_progress \
    --limit 1 --json databaseId --jq '.[0].databaseId')
  [ -n "$RUN_ID" ] && break
  sleep 2
done
if [ -z "$RUN_ID" ]; then
  RUN_ID=$(gh run list --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')
fi
if [ -z "$RUN_ID" ]; then
  echo "No workflow runs found for branch $BRANCH" >&2
  exit 1
fi

echo "Watching run $RUN_ID on branch $BRANCH..."
gh run watch "$RUN_ID" --exit-status
