#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Error: not in a git repository"
  exit 1
fi

if git diff --quiet --ignore-submodules -- . && git diff --cached --quiet --ignore-submodules -- .; then
  echo "No changes to commit."
else
  git add .
  git commit -m "${1:-Update code}"
fi

git push origin main




# cmd
# ./scripts/push-main.sh "Commit message"