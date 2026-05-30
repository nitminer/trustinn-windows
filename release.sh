#!/bin/bash

# Release script for Trustinn Windows Electron App
# Usage: ./release.sh <tag> <commit-message>
# Example: ./release.sh v0.0.7 "Add auto-update feature"

set -e  # Exit on error

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing arguments${NC}"
    echo "Usage: ./release.sh <tag> <commit-message>"
    echo "Example: ./release.sh v0.0.7 \"Add auto-update feature\""
    exit 1
fi

TAG=$1
COMMIT_MSG=$2
# Extract version from tag (remove 'v' prefix)
VERSION="${TAG#v}"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Trustinn Windows Release Script${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}Release Configuration:${NC}"
echo "  Tag: ${TAG}"
echo "  Version: ${VERSION}"
echo "  Commit Message: ${COMMIT_MSG}"
echo ""

# Step 1: Update version in package.json
echo -e "${BLUE}[1/5] Updating package.json version...${NC}"
sed -i '' "s/\"version\": \".*\"/\"version\": \"${VERSION}\"/" package.json
CURRENT_VERSION=$(node -e "console.log(require('./package.json').version)")
echo -e "${GREEN}✓ Version updated to: ${CURRENT_VERSION}${NC}"
echo ""

# Step 2: Commit changes
echo -e "${BLUE}[2/5] Committing changes...${NC}"
git add .
git commit -m "${COMMIT_MSG}"
echo -e "${GREEN}✓ Committed with message: \"${COMMIT_MSG}\"${NC}"
echo ""

# Step 3: Create git tag
echo -e "${BLUE}[3/5] Creating git tag...${NC}"
# Delete tag if it exists locally
git tag -d ${TAG} 2>/dev/null || true
# Delete tag from remote if it exists
git push origin :${TAG} 2>/dev/null || true
# Create new tag
git tag ${TAG}
echo -e "${GREEN}✓ Tag created: ${TAG}${NC}"
echo ""

# Step 4: Push to remote
echo -e "${BLUE}[4/5] Pushing to remote repository...${NC}"
git push origin main
git push origin ${TAG}
echo -e "${GREEN}✓ Pushed to origin${NC}"
echo ""

# Step 5: Summary
echo -e "${BLUE}[5/5] Release summary${NC}"
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✓ Release ${TAG} created successfully!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Watch the build at: https://github.com/nitminer/trustinn-windows/actions"
echo "  2. Check releases at: https://github.com/nitminer/trustinn-windows/releases"
echo "  3. Installed app will auto-update to ${VERSION}"
echo ""
