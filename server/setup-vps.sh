#!/bin/bash

# VPS Initial Setup Script
# Run this script first to prepare your VPS

set -e

echo "🔧 Setting up VPS for eSIM Service..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    print_error "Please run as root (use sudo)"
    exit 1
fi

print_info "Starting VPS setup..."

# Update system
print_info "Updating system packages..."
apt-get update
apt-get upgrade -y
print_success "System updated"

# Install essential packages
print_info "Installing essential packages..."
apt-get install -y \
    curl \
    wget \
    git \
    vim \
    htop \
    ufw \
    fail2ban \
    unzip
print_success "Essential packages installed"

# Install Docker
print_info "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    print_success "Docker installed"
else
    print_info "Docker already installed"
fi

# Install Docker Compose
print_info "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_info "Docker Compose already installed"
fi

# Configure firewall
print_info "Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw reload
print_success "Firewall configured"

# Configure fail2ban
print_info "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban
print_success "Fail2ban configured"

# Create deployment directory
print_info "Creating deployment directory..."
mkdir -p /opt/esim-service
mkdir -p /opt/esim-service/logs
print_success "Deployment directory created"

# Set up log rotation
print_info "Setting up log rotation..."
cat > /etc/logrotate.d/esim-service << 'EOF'
/opt/esim-service/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 root root
    sharedscripts
}
EOF
print_success "Log rotation configured"

# Display system information
print_info "System Information:"
echo "  OS: $(lsb_release -d | cut -f2)"
echo "  Kernel: $(uname -r)"
echo "  Docker: $(docker --version)"
echo "  Docker Compose: $(docker-compose --version)"
echo "  Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "  Disk: $(df -h / | awk 'NR==2 {print $2}')"

echo ""
print_success "🎉 VPS setup complete!"
echo ""
print_info "Next steps:"
echo "  1. Copy your .env file to the server"
echo "  2. Run the deploy.sh script from your local machine"
echo "  3. Access the dashboard at http://YOUR_VPS_IP/dashboard"

