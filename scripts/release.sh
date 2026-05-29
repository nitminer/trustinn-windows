#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not in a git repository"
  exit 1
fi

if [ $# -lt 1 ]; then
  echo "Usage: $0 <version> [commit-message]"
  echo "Example: $0 0.0.2 'Release v0.0.2'"
  exit 1
fi

VERSION="$1"
COMMIT_MESSAGE="${2:-Release v$VERSION}"
TAG="v$VERSION"

if git diff --quiet --ignore-submodules -- . && git diff --cached --quiet --ignore-submodules -- .; then
  echo "No changes to commit."
else
  git add .
  git commit -m "$COMMIT_MESSAGE"
fi

git push origin main

echo "Pushed main branch."

if git rev-parse "$TAG" >/dev/null 2>&1; then
  echo "Tag $TAG already exists locally."
else
  git tag -a "$TAG" -m "$COMMIT_MESSAGE"
  echo "Created tag $TAG."
fi

git push origin "$TAG"

echo "Pushed tag $TAG to origin."

echo "Release complete."
