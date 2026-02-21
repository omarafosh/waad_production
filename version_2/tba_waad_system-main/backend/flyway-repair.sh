#!/bin/bash
# ================================================================
# 🛠️ Flyway Repair Script - Safe Checksum Fix
# ================================================================
# This script safely repairs Flyway checksum mismatches
# ⚠️ WARNING: Only use in development after taking backup!
# ================================================================

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-tba_waad_system}"
DB_USER="${DB_USER:-postgres}"
BACKUP_DIR="/tmp/flyway_backups"

echo -e "${YELLOW}╔════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║   🛠️  Flyway Repair - Safe Mode          ║${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if running in production
if [[ "${SPRING_PROFILES_ACTIVE}" == "prod" ]]; then
    echo -e "${RED}❌ STOPPED: Cannot run repair in production!${NC}"
    echo -e "${YELLOW}📝 Please contact DevOps team for production repairs${NC}"
    exit 1
fi

# Confirm with user
echo -e "${YELLOW}⚠️  This will repair Flyway checksums${NC}"
echo -e "Database: ${GREEN}${DB_HOST}:${DB_PORT}/${DB_NAME}${NC}"
echo ""
read -p "Continue? (yes/no): " confirm
if [[ "$confirm" != "yes" ]]; then
    echo -e "${RED}❌ Cancelled${NC}"
    exit 0
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/backup_before_repair_$(date +%Y%m%d_%H%M%S).dump"

# Step 1: Backup
echo -e "\n${YELLOW}📦 Step 1: Creating backup...${NC}"
if command -v pg_dump &> /dev/null; then
    pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc -f "$BACKUP_FILE" "$DB_NAME"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup created: $BACKUP_FILE${NC}"
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo -e "   Size: ${GREEN}${BACKUP_SIZE}${NC}"
    else
        echo -e "${RED}❌ Backup failed!${NC}"
        exit 1
    fi
else
    echo -e "${RED}⚠️  pg_dump not found - Proceeding without backup${NC}"
    read -p "Continue without backup? (yes/no): " confirm_no_backup
    if [[ "$confirm_no_backup" != "yes" ]]; then
        echo -e "${RED}❌ Cancelled${NC}"
        exit 0
    fi
fi

# Step 2: Show current Flyway status
echo -e "\n${YELLOW}📊 Step 2: Current Flyway status...${NC}"
cd "$(dirname "$0")"
mvn flyway:info -q || echo "Flyway info failed (expected if checksum error)"

# Step 3: Repair
echo -e "\n${YELLOW}🔧 Step 3: Running Flyway repair...${NC}"
mvn flyway:repair

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Repair completed successfully${NC}"
else
    echo -e "${RED}❌ Repair failed!${NC}"
    if [ -f "$BACKUP_FILE" ]; then
        echo -e "${YELLOW}📝 To restore backup:${NC}"
        echo -e "   pg_restore -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME $BACKUP_FILE"
    fi
    exit 1
fi

# Step 4: Verify
echo -e "\n${YELLOW}✅ Step 4: Verifying repair...${NC}"
mvn flyway:info

# Step 5: Test migrate
echo -e "\n${YELLOW}🚀 Step 5: Testing migrate...${NC}"
mvn flyway:migrate

echo -e "\n${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║   ✅ Flyway repair completed!             ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo -e ""
echo -e "${YELLOW}📝 Backup location:${NC} $BACKUP_FILE"
echo -e "${YELLOW}📝 Keep backup for at least 7 days${NC}"
echo ""
echo -e "${YELLOW}⚠️  Remember: Next time, create new V+1 migration instead of modifying existing files!${NC}"
