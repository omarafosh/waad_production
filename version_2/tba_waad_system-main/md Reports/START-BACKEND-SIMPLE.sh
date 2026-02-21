#!/bin/bash
# Simple Backend Starter Script

echo "🚀 Starting TBA WAAD Backend..."

cd /workspaces/tba_waad_system/backend

# Kill existing processes
echo "⏹️ Stopping existing Backend processes..."
pkill -9 -f "java.*tba" 2>/dev/null

# Clean logs
rm -f backend.log nohup.out

# Set environment
export DB_URL="jdbc:postgresql://localhost:5432/tba_waad_system"
export DB_USERNAME="postgres"
export DB_PASSWORD="12345"

echo "📦 Building and starting..."
mvn clean compile spring-boot:run &

BACKEND_PID=$!
echo "✅ Backend started with PID: $BACKEND_PID"
echo ""
echo "📝 Logs: tail -f backend.log"
echo "🛑 Stop: kill $BACKEND_PID"
echo ""
echo "⏳ Waiting for startup (this takes ~60 seconds)..."

# Wait and check
for i in {1..30}; do
    sleep 3
    if curl -s http://localhost:8080/actuator/health 2>/dev/null | grep -q "UP"; then
        echo ""
        echo "✅✅✅ Backend is UP and READY! ✅✅✅"
        curl -s http://localhost:8080/actuator/health
        exit 0
    fi
    echo -n "."
done

echo ""
echo "⚠️ Backend not ready after 90s. Check logs:"
echo "tail -50 backend.log"
