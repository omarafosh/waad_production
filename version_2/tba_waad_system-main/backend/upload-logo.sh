#!/bin/bash

###############################################################################
# Script: upload-logo.sh
# Purpose: Upload company logo to PDF settings automatically
# Usage: ./upload-logo.sh
###############################################################################

set -e

LOGO_PATH="/workspaces/tba_waad_system/logo Waad TPA.png"
API_URL="http://localhost:8080/api/pdf/settings/1/logo"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Waad TPA Logo Upload Script${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Check if logo file exists
if [ ! -f "$LOGO_PATH" ]; then
    echo -e "${RED}❌ Error: Logo file not found at: $LOGO_PATH${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Logo file found: $(ls -lh "$LOGO_PATH" | awk '{print $5}')${NC}"
echo ""

# Check if server is running
echo "🔍 Checking if server is running..."
if ! curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/actuator/health | grep -q "200"; then
    echo -e "${RED}❌ Error: Server is not running on localhost:8080${NC}"
    echo "   Please start the server first: mvn spring-boot:run"
    exit 1
fi

echo -e "${GREEN}✅ Server is running${NC}"
echo ""

# Get admin token (you'll need to replace this with actual token)
echo "🔐 Authentication required..."
echo "   Please enter your admin JWT token:"
read -s TOKEN
echo ""

if [ -z "$TOKEN" ]; then
    echo -e "${YELLOW}⚠️  No token provided. Attempting without authentication...${NC}"
    CURL_AUTH=""
else
    CURL_AUTH="-H \"Authorization: Bearer $TOKEN\""
fi

# Upload logo
echo "📤 Uploading logo to PDF settings..."
echo "   API: POST $API_URL"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" \
    -X POST "$API_URL" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$LOGO_PATH" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
    echo -e "${GREEN}✅ SUCCESS! Logo uploaded successfully!${NC}"
    echo ""
    echo -e "${GREEN}📄 The logo will now appear in all PDF reports.${NC}"
    echo ""
    echo "🧪 Test it by generating a sample report:"
    echo "   curl -X GET http://localhost:8080/api/pdf/reports/claims/sample -o test.pdf"
    echo ""
else
    echo -e "${RED}❌ Upload failed (HTTP $HTTP_CODE)${NC}"
    echo "Response: $BODY"
    echo ""
    echo "💡 Troubleshooting:"
    echo "   1. Make sure you're using a valid SUPER_ADMIN token"
    echo "   2. Check server logs for errors"
    echo "   3. Verify the settings ID exists (default is 1)"
    exit 1
fi

echo -e "${YELLOW}========================================${NC}"
