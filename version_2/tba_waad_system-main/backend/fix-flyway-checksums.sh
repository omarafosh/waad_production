#!/bin/bash
# fix-flyway-checksums.sh
# Helper script to repair Flyway checksums after migration file changes

set -e

echo "========================================"
echo "Flyway Checksum Repair Utility"
echo "========================================"
echo ""
echo "This script repairs Flyway checksums when migration files have been modified."
echo "Use this when you see 'Migration checksum mismatch' errors."
echo ""

# Check if we're in the backend directory
if [ ! -f "pom.xml" ]; then
    echo "Error: This script must be run from the backend directory"
    echo "Usage: cd backend && ./fix-flyway-checksums.sh"
    exit 1
fi

echo "Step 1: Repairing Flyway schema history..."
mvn flyway:repair

echo ""
echo "Step 2: Running migrations..."
mvn flyway:migrate

echo ""
echo "========================================"
echo "* Flyway checksums repaired successfully!"
echo "* Migrations applied successfully!"
echo "========================================"
echo ""
echo "You can now start the application normally."
