#!/bin/bash

# Development release script for main branch updates (no tagging)
# Usage: ./dev-release.sh <commit-message>
# Example: ./dev-release.sh "Fix UI bug"

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Error: Missing commit message${NC}"
    echo "Usage: ./dev-release.sh <commit-message>"
    echo "Example: ./dev-release.sh \"Fix UI bug\""
    exit 1
fi

COMMIT_MSG=$1

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Trustinn Development Release${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}Configuration:${NC}"
echo "  Branch: main (development)"
echo "  Commit Message: ${COMMIT_MSG}"
echo ""

# Step 1: Get current version
echo -e "${BLUE}[1/3] Checking current version...${NC}"
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
echo -e "${GREEN}✓ Current version: ${CURRENT_VERSION}${NC}"
echo ""

# Step 2: Commit changes
echo -e "${BLUE}[2/3] Committing changes...${NC}"
git add -A
git commit -m "${COMMIT_MSG}"
echo -e "${GREEN}✓ Committed with message: \"${COMMIT_MSG}\"${NC}"
echo ""

# Step 3: Push to main
echo -e "${BLUE}[3/3] Pushing to main branch...${NC}"
git push origin main
echo -e "${GREEN}✓ Pushed to main branch${NC}"
echo ""

# Summary
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Development release pushed!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Watch the build at: https://github.com/nitminer/trustinn-windows/actions"
echo "  2. This builds version v${CURRENT_VERSION}-build.<number>"
echo ""
echo "To create a tagged release, use:"
echo "  ./release.sh v<version> <commit-message>"
echo "  Example: ./release.sh v0.0.7 \"Add new feature\""
echo ""
