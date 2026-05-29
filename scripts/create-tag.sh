#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ $# -lt 1 ]; then
  echo "Usage: $0 <version> [message]"
  echo "Example: $0 0.0.2 'Release v0.0.2'"
  exit 1
fi

TAG="v$1"
MESSAGE="${2:-Release $TAG}"

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Error: local tag '$TAG' already exists."
  exit 1
fi

git tag -a "$TAG" -m "$MESSAGE"
git push origin "$TAG"


# ./scripts/create-tag.sh 0.0.1 "Release v0.0.1"