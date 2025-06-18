#!/bin/bash

# Jaaz Cloud Development Deployment Script for EC2
# Run this script on your EC2 instance

set -e

echo "🚀 Starting Jaaz Cloud Development Deployment on EC2..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo -e "${GREEN}📁 Working directory: $(pwd)${NC}"

# Check if .env.dev exists in deploy directory
if [ ! -f "deploy/.env.dev" ]; then
    echo -e "${RED}❌ deploy/.env.dev file not found!${NC}"
    echo -e "${YELLOW}Please copy deploy/env.dev.example to deploy/.env.dev and configure your environment variables.${NC}"
    exit 1
fi

# Load environment variables
export $(cat deploy/.env.dev | grep -v '^#' | xargs)

echo -e "${GREEN}✅ Environment variables loaded${NC}"

# Stop existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose -f deploy/docker-compose.dev.yml down || true

# Remove old images (optional, uncomment if you want to rebuild from scratch)
# echo -e "${YELLOW}🗑️  Removing old images...${NC}"
# docker rmi $(docker images -q jaaz-cloud*) || true

# Build and start services
echo -e "${YELLOW}🔨 Building and starting services...${NC}"
docker-compose -f deploy/docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to be ready...${NC}"
sleep 30

# Check if services are running
echo -e "${YELLOW}🔍 Checking service status...${NC}"
docker-compose -f deploy/docker-compose.dev.yml ps

# Show logs
echo -e "${GREEN}📋 Recent logs:${NC}"
docker-compose -f deploy/docker-compose.dev.yml logs --tail=50

echo -e "${GREEN}🎉 Deployment completed!${NC}"
echo -e "${GREEN}Your application should be available at: http://$(curl -s http://checkip.amazonaws.com):3000${NC}"
echo -e "${YELLOW}To view logs: docker-compose -f deploy/docker-compose.dev.yml logs -f${NC}"
echo -e "${YELLOW}To stop services: docker-compose -f deploy/docker-compose.dev.yml down${NC}"
