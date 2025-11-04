#!/bin/bash

# Generate Update Manifest for Tauri Updater
# This script creates a signed update manifest JSON file for GitHub Releases

set -e

# Configuration
REPO="highvoltag3/mermalaid"
VERSION="${1:-}"
PRIVATE_KEY="${TAURI_PRIVATE_KEY:-$HOME/.tauri/mermalaid.key}"
OUTPUT_FILE="latest.json"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version is provided
if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Version not provided${NC}"
    echo "Usage: $0 <version>"
    echo "Example: $0 1.2.0"
    exit 1
fi

# Remove 'v' prefix if present
VERSION="${VERSION#v}"

# Check if private key exists
if [ ! -f "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: Private key not found at $PRIVATE_KEY${NC}"
    echo "Generate keys with: npm run tauri signer generate -- -w $PRIVATE_KEY"
    exit 1
fi

echo -e "${GREEN}Generating update manifest for version $VERSION...${NC}"

# Get current timestamp
PUB_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Detect architecture and platform
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    ARCH_SUFFIX="x64"
elif [ "$ARCH" = "arm64" ] || [ "$ARCH" = "aarch64" ]; then
    ARCH_SUFFIX="aarch64"
else
    ARCH_SUFFIX="$ARCH"
fi

PLATFORM="darwin-$ARCH_SUFFIX"

# Construct download URLs
BASE_URL="https://github.com/$REPO/releases/download/v$VERSION"
APP_NAME="Mermalaid"
TAR_GZ="${APP_NAME}_${VERSION}_${ARCH_SUFFIX}.app.tar.gz"
SIG_FILE="${TAR_GZ}.sig"
DOWNLOAD_URL="${BASE_URL}/${TAR_GZ}"

echo -e "${YELLOW}Platform: $PLATFORM${NC}"
echo -e "${YELLOW}Download URL: $DOWNLOAD_URL${NC}"

# Sign the update bundle if it exists locally
if [ -f "$TAR_GZ" ]; then
    echo -e "${GREEN}Signing update bundle...${NC}"
    npm run tauri signer sign -- -w "$PRIVATE_KEY" -f "$TAR_GZ" -o "$SIG_FILE"
    
    if [ -f "$SIG_FILE" ]; then
        SIGNATURE=$(cat "$SIG_FILE")
        echo -e "${GREEN}✓ Bundle signed${NC}"
    else
        echo -e "${RED}Error: Failed to generate signature${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Warning: Update bundle not found locally ($TAR_GZ)${NC}"
    echo -e "${YELLOW}You'll need to sign it separately and update the manifest${NC}"
    SIGNATURE=""
fi

# Generate manifest JSON
cat > "$OUTPUT_FILE" <<EOF
{
  "version": "$VERSION",
  "notes": "Release $VERSION",
  "pub_date": "$PUB_DATE",
  "platforms": {
    "$PLATFORM": {
      "signature": "$SIGNATURE",
      "url": "$DOWNLOAD_URL"
    }
  }
}
EOF

echo -e "${GREEN}✓ Update manifest generated: $OUTPUT_FILE${NC}"
echo ""
echo "Next steps:"
echo "1. Review $OUTPUT_FILE"
echo "2. Upload $OUTPUT_FILE to GitHub Releases as 'latest.json'"
echo "3. Ensure the update bundle ($TAR_GZ) and signature ($SIG_FILE) are uploaded"
echo "4. Verify the manifest is accessible at: https://github.com/$REPO/releases/latest/download/latest.json"

