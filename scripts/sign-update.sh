#!/bin/bash

# Sign Update Bundle for Tauri Updater
# This script signs a Tauri update bundle (.app.tar.gz) file

set -e

# Configuration
PRIVATE_KEY="${TAURI_PRIVATE_KEY:-$HOME/.tauri/mermalaid.key}"
INPUT_FILE="${1:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if input file is provided
if [ -z "$INPUT_FILE" ]; then
    echo -e "${RED}Error: Input file not provided${NC}"
    echo "Usage: $0 <update-bundle.tar.gz>"
    echo "Example: $0 Mermalaid_1.2.0_x64.app.tar.gz"
    exit 1
fi

# Check if input file exists
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}Error: Input file not found: $INPUT_FILE${NC}"
    exit 1
fi

# Check if private key exists
if [ ! -f "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: Private key not found at $PRIVATE_KEY${NC}"
    echo "Generate keys with: npm run tauri signer generate -- -w $PRIVATE_KEY"
    exit 1
fi

# Output signature file
SIG_FILE="${INPUT_FILE}.sig"

echo -e "${GREEN}Signing update bundle: $INPUT_FILE${NC}"

# Sign the file
npm run tauri signer sign -- -w "$PRIVATE_KEY" -f "$INPUT_FILE" -o "$SIG_FILE"

if [ -f "$SIG_FILE" ]; then
    echo -e "${GREEN}✓ Signature generated: $SIG_FILE${NC}"
    echo ""
    echo "Signature content:"
    cat "$SIG_FILE"
    echo ""
    echo "Upload both files to GitHub Releases:"
    echo "  - $INPUT_FILE"
    echo "  - $SIG_FILE"
else
    echo -e "${RED}Error: Failed to generate signature${NC}"
    exit 1
fi

