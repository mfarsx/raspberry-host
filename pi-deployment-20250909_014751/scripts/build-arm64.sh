#!/bin/bash

# ARM64 Build Script for Raspberry Pi
# This script helps build Docker images optimized for ARM64 architecture

set -e

echo "🚀 Building ARM64 optimized Docker images..."

# Build API
echo "📦 Building API..."
docker build -f api/Dockerfile.dev -t pi-api-dev:arm64 ./api

# Build Web
echo "🌐 Building Web..."
docker build -f web/Dockerfile.dev -t pi-web-dev:arm64 ./web

echo "✅ Build complete!"
echo ""
echo "To start the development environment:"
echo "  make dev"
echo ""
echo "To check status:"
echo "  docker compose -f compose.dev.yaml ps"