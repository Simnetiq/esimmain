#!/bin/bash

# eSIM Service Deployment Script
# This script deploys the eSIM service to a VPS

set -e

echo "🚀 Starting eSIM Service Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
VPS_HOST="72.61.87.54"
VPS_USER="root"
DEPLOY_PATH="/opt/esim-service"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if .env file exists
if [ ! -f ".env" ]; then
    print_error ".env file not found!"
    print_info "Please copy .env.example to .env and fill in your configuration"
    exit 1
fi

print_success ".env file found"

# Connect to VPS and deploy
print_info "Connecting to VPS at $VPS_HOST..."

ssh $VPS_USER@$VPS_HOST << 'ENDSSH'
    set -e
    
    echo "📦 Installing dependencies..."
    
    # Update system
    apt-get update
    apt-get upgrade -y
    
    # Install Docker if not installed
    if ! command -v docker &> /dev/null; then
        echo "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
    fi
    
    # Install Docker Compose if not installed
    if ! command -v docker-compose &> /dev/null; then
        echo "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi
    
    echo "✓ Dependencies installed"
    
    # Create deployment directory
    mkdir -p /opt/esim-service
    
    echo "✓ Deployment directory created"
ENDSSH

print_success "VPS prepared"

# Copy files to VPS
print_info "Copying files to VPS..."

rsync -avz --progress \
    --exclude 'node_modules' \
    --exclude '.git' \
    --exclude 'logs' \
    ./ $VPS_USER@$VPS_HOST:$DEPLOY_PATH/

print_success "Files copied"

# Deploy on VPS
print_info "Starting services..."

ssh $VPS_USER@$VPS_HOST << ENDSSH
    set -e
    cd $DEPLOY_PATH
    
    # Stop existing containers
    docker-compose down || true
    
    # Build and start containers
    docker-compose up -d --build
    
    # Wait for services to be healthy
    echo "⏳ Waiting for services to start..."
    sleep 10
    
    # Check service health
    docker-compose ps
    
    echo "✓ Services started"
ENDSSH

print_success "Deployment complete!"

# Display service URLs
print_info "Service URLs:"
echo "  API: http://$VPS_HOST/api/"
echo "  Dashboard: http://$VPS_HOST/dashboard"
echo "  Health Check: http://$VPS_HOST/health"

print_info "Dashboard credentials:"
echo "  Username: Check your .env file (DASHBOARD_USERNAME)"
echo "  Password: Check your .env file (DASHBOARD_PASSWORD)"

echo ""
print_success "🎉 Deployment successful!"

