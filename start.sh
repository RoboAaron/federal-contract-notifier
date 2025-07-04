#!/bin/bash

# Federal Contract Notifier Startup Script

set -e

echo "🚀 Starting Federal Contract Notifier..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker compose is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker and try again."
    exit 1
fi
if ! docker compose version > /dev/null 2>&1; then
    echo "❌ Docker Compose V2 is not installed. Please install Docker Compose V2 and try again."
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo "🛑 Stopping services..."
    docker compose down
    echo "✅ Services stopped."
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Build and start services
echo "📦 Building and starting services..."
docker compose --profile prod up -d --build

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations
echo "🗄️  Running database migrations..."
docker compose exec -T backend npx prisma migrate deploy || {
    echo "⚠️  Migration failed, but continuing..."
}

# Generate Prisma client
echo "🔧 Generating Prisma client..."
docker compose exec -T backend npx prisma generate || {
    echo "⚠️  Prisma client generation failed, but continuing..."
}

echo ""
echo "✅ Federal Contract Notifier is starting up!"
echo ""
echo "🌐 Access the application:"
echo "   Frontend: http://localhost:38889"
echo "   Backend API: http://localhost:38888"
echo ""
echo "📊 View logs: docker compose logs -f"
echo "🛑 Stop services: docker compose down"
echo ""
echo "⏳ Services are starting up. Please wait a moment for everything to be ready..."

# Keep the script running to maintain the trap
wait 