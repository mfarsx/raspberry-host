#!/bin/bash

# Quick project deployment script for Pi

print_status() {
    echo -e "\033[0;32m[INFO]\033[0m $1"
}

print_header() {
    echo -e "\033[0;34m================================\033[0m"
    echo -e "\033[0;34m$1\033[0m"
    echo -e "\033[0;34m================================\033[0m"
}

print_header "Deploying Projects on Raspberry Pi"

# Deploy website
print_status "Deploying website project..."
# This would typically be done through the web interface
echo "Please deploy through the web interface at: https://$(grep DOMAIN .env | cut -d'=' -f2)/deploy"
echo "Use these settings:"
echo "  - Repository: https://github.com/yourusername/pi-website.git"
echo "  - Domain: website.$(grep DOMAIN .env | cut -d'=' -f2)"
echo "  - Port: 80"

# Deploy VPN
print_status "Deploying VPN project..."
echo "VPN deployment settings:"
echo "  - Repository: https://github.com/yourusername/pi-vpn.git"
echo "  - Domain: vpn.$(grep DOMAIN .env | cut -d'=' -f2)"
echo "  - Port: 51820 (UDP)"
echo "  - Environment: SERVERURL=$(grep DOMAIN .env | cut -d'=' -f2)"

# Deploy adblocker
print_status "Deploying adblocker project..."
echo "Adblocker deployment settings:"
echo "  - Repository: https://github.com/yourusername/pi-adblocker.git"
echo "  - Domain: adblock.$(grep DOMAIN .env | cut -d'=' -f2)"
echo "  - Port: 80"
echo "  - Environment: WEBPASSWORD=your-admin-password"
