#!/bin/bash

# 🍓 Raspberry Pi Setup Script
# Run this on your Raspberry Pi after transferring files

set -e

print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_header() {
    echo -e "\033[0;34m================================\033[0m"
    echo -e "\033[0;34m$1\033[0m"
    echo -e "\033[0;34m================================\033[0m"
}

print_header "Setting up Raspberry Pi Hosting Platform"

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    sudo usermod -aG docker $USER
    print_warning "Please log out and back in for Docker group changes to take effect"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo apt install docker-compose-plugin -y
fi

# Configure environment
if [[ ! -f .env ]]; then
    print_status "Setting up environment configuration..."
    cp .env.pi .env
    print_warning "Please edit .env file with your domain and passwords before continuing"
    print_warning "Required: DOMAIN, TLS_EMAIL, MONGO_ROOT_PASSWORD, REDIS_PASSWORD, JWT_SECRET"
    read -p "Press Enter after editing .env file..."
fi

# Create necessary directories
mkdir -p logs backups scripts projects

# Enable IP forwarding for VPN
print_status "Enabling IP forwarding..."
echo 'net.ipv4.ip_forward = 1' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Configure firewall
print_status "Configuring firewall..."
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 51820/udp
sudo ufw allow 53
sudo ufw --force enable

# Start the platform
print_status "Starting hosting platform..."
make up

print_status "Setup complete! Access your platform at: https://$(grep DOMAIN .env | cut -d'=' -f2)"
