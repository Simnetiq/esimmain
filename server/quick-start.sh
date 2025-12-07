#!/bin/bash

# Quick Start Script for eSIM Service
# This script helps you get started quickly

set -e

echo "🚀 eSIM Service - Quick Start"
echo "=============================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env file not found!${NC}"
    echo ""
    echo "Creating .env from template..."
    cp .env.template .env
    echo -e "${GREEN}✓ .env file created${NC}"
    echo ""
    echo -e "${YELLOW}📝 Please edit .env file and fill in your credentials:${NC}"
    echo "   - Supabase URL and key"
    echo "   - Stripe keys"
    echo "   - Twilio credentials"
    echo "   - SMTP settings"
    echo "   - Dashboard password"
    echo ""
    echo "Run this script again after configuring .env"
    exit 0
fi

echo -e "${GREEN}✓ .env file found${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker is not installed${NC}"
    echo "Please install Docker first: https://docs.docker.com/get-docker/"
    exit 1
fi

echo -e "${GREEN}✓ Docker is installed${NC}"

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}✗ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose first"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose is installed${NC}"
echo ""

# Ask user what to do
echo "What would you like to do?"
echo "1) Start services"
echo "2) Stop services"
echo "3) View logs"
echo "4) Restart services"
echo "5) Check status"
echo "6) Run tests"
echo "7) Clean up (remove all containers and volumes)"
echo ""
read -p "Enter your choice (1-7): " choice

case $choice in
    1)
        echo ""
        echo "Starting services..."
        docker-compose up -d --build
        echo ""
        echo -e "${GREEN}✓ Services started!${NC}"
        echo ""
        echo "Access points:"
        echo "  - API: http://localhost/api/"
        echo "  - Dashboard: http://localhost/dashboard"
        echo "  - Health: http://localhost/health"
        echo ""
        echo "View logs: docker-compose logs -f"
        ;;
    2)
        echo ""
        echo "Stopping services..."
        docker-compose down
        echo -e "${GREEN}✓ Services stopped${NC}"
        ;;
    3)
        echo ""
        echo "Viewing logs (Ctrl+C to exit)..."
        docker-compose logs -f
        ;;
    4)
        echo ""
        echo "Restarting services..."
        docker-compose restart
        echo -e "${GREEN}✓ Services restarted${NC}"
        ;;
    5)
        echo ""
        echo "Service status:"
        docker-compose ps
        echo ""
        echo "Health check:"
        curl -s http://localhost/health || echo "Services not responding"
        ;;
    6)
        echo ""
        echo "Running tests..."
        echo ""
        echo "Testing API health..."
        curl -s http://localhost/api/health | jq . || echo "API not responding"
        echo ""
        echo "Testing dashboard..."
        curl -s -I http://localhost/dashboard | head -n 1
        ;;
    7)
        echo ""
        read -p "Are you sure you want to remove all containers and volumes? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "Cleaning up..."
            docker-compose down -v
            echo -e "${GREEN}✓ Cleanup complete${NC}"
        else
            echo "Cancelled"
        fi
        ;;
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac

