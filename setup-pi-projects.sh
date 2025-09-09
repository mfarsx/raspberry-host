#!/bin/bash

# 🍓 Raspberry Pi Multi-Project Setup Script
# This script helps you set up multiple projects on your Raspberry Pi hosting platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

# Check if running on Raspberry Pi
check_pi() {
    if [[ ! -f /proc/device-tree/model ]] || ! grep -q "Raspberry Pi" /proc/device-tree/model; then
        print_warning "This script is designed for Raspberry Pi. Some features may not work on other systems."
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    # Check if Docker is installed
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Run: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
        exit 1
    fi
    
    # Check if Docker Compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    
    # Check if git is installed
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    
    print_status "All prerequisites are met!"
}

# Setup environment
setup_environment() {
    print_header "Setting Up Environment"
    
    # Check if .env exists
    if [[ ! -f .env ]]; then
        print_status "Creating .env file from template..."
        cp .env.example .env
        print_warning "Please edit .env file with your configuration before continuing."
        print_warning "Required: DOMAIN, TLS_EMAIL, MONGO_ROOT_PASSWORD, REDIS_PASSWORD, JWT_SECRET"
        read -p "Press Enter after editing .env file..."
    else
        print_status ".env file already exists"
    fi
    
    # Create necessary directories
    mkdir -p logs backups scripts projects
    print_status "Created necessary directories"
}

# Start the hosting platform
start_platform() {
    print_header "Starting Hosting Platform"
    
    print_status "Building and starting services..."
    make up
    
    # Wait for services to be ready
    print_status "Waiting for services to be ready..."
    sleep 30
    
    # Check service status
    print_status "Checking service status..."
    make status
    
    print_status "Platform is ready! Access it at: https://$(grep DOMAIN .env | cut -d'=' -f2)"
}

# Setup networking
setup_networking() {
    print_header "Setting Up Networking"
    
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
    
    print_status "Networking configured!"
}

# Create project templates
create_project_templates() {
    print_header "Creating Project Templates"
    
    # Website template
    if [[ ! -d "templates/website" ]]; then
        mkdir -p templates/website
        cp examples/website/* templates/website/
        print_status "Created website template"
    fi
    
    # VPN template
    if [[ ! -d "templates/vpn" ]]; then
        mkdir -p templates/vpn
        cp examples/vpn/* templates/vpn/
        print_status "Created VPN template"
    fi
    
    # Adblocker template
    if [[ ! -d "templates/adblocker" ]]; then
        mkdir -p templates/adblocker
        cp examples/adblocker/* templates/adblocker/
        print_status "Created adblocker template"
    fi
}

# Deploy website project
deploy_website() {
    print_header "Deploying Website Project"
    
    read -p "Enter your domain for the website (e.g., website.yourdomain.com): " WEBSITE_DOMAIN
    read -p "Enter your Git repository URL (or press Enter to use template): " WEBSITE_REPO
    
    if [[ -z "$WEBSITE_REPO" ]]; then
        # Use template
        WEBSITE_REPO="https://github.com/yourusername/pi-website.git"
        print_warning "Using template repository. Please update with your own repository."
    fi
    
    print_status "Deploying website to: $WEBSITE_DOMAIN"
    print_status "Repository: $WEBSITE_REPO"
    
    # This would typically be done through the web interface
    print_status "Please deploy through the web interface at: https://$(grep DOMAIN .env | cut -d'=' -f2)/deploy"
    print_status "Use these settings:"
    echo "  - Repository URL: $WEBSITE_REPO"
    echo "  - Domain: $WEBSITE_DOMAIN"
    echo "  - Port: 80"
}

# Deploy VPN project
deploy_vpn() {
    print_header "Deploying VPN Project"
    
    read -p "Enter your domain for VPN (e.g., vpn.yourdomain.com): " VPN_DOMAIN
    read -p "Enter number of VPN clients (default: 5): " VPN_PEERS
    VPN_PEERS=${VPN_PEERS:-5}
    
    print_status "Deploying VPN with $VPN_PEERS clients"
    print_status "Domain: $VPN_DOMAIN"
    
    # Create VPN configuration
    cat > vpn-config.env << EOF
SERVERURL=$(grep DOMAIN .env | cut -d'=' -f2)
SERVERPORT=51820
PEERS=$VPN_PEERS
WEBPASSWORD=$(openssl rand -base64 32)
EOF
    
    print_status "VPN configuration created in vpn-config.env"
    print_status "Please deploy through the web interface with these environment variables:"
    cat vpn-config.env
}

# Deploy adblocker project
deploy_adblocker() {
    print_header "Deploying Adblocker Project"
    
    read -p "Enter your domain for adblocker (e.g., adblock.yourdomain.com): " ADBLOCK_DOMAIN
    read -p "Enter admin password for Pi-hole: " ADBLOCK_PASSWORD
    
    print_status "Deploying Pi-hole adblocker"
    print_status "Domain: $ADBLOCK_DOMAIN"
    
    # Create adblocker configuration
    cat > adblock-config.env << EOF
VIRTUAL_HOST=$ADBLOCK_DOMAIN
WEBPASSWORD=$ADBLOCK_PASSWORD
DNS1=1.1.1.1
DNS2=1.0.0.1
LETSENCRYPT_HOST=$ADBLOCK_DOMAIN
LETSENCRYPT_EMAIL=$(grep TLS_EMAIL .env | cut -d'=' -f2)
EOF
    
    print_status "Adblocker configuration created in adblock-config.env"
    print_status "Please deploy through the web interface with these environment variables:"
    cat adblock-config.env
}

# Main menu
show_menu() {
    print_header "Raspberry Pi Multi-Project Setup"
    echo "1. Setup hosting platform"
    echo "2. Deploy website project"
    echo "3. Deploy VPN project"
    echo "4. Deploy adblocker project"
    echo "5. Setup all projects"
    echo "6. Show status"
    echo "7. Exit"
    echo
    read -p "Choose an option (1-7): " choice
}

# Main execution
main() {
    print_header "🍓 Raspberry Pi Multi-Project Setup"
    
    check_pi
    check_prerequisites
    
    while true; do
        show_menu
        case $choice in
            1)
                setup_environment
                start_platform
                setup_networking
                create_project_templates
                ;;
            2)
                deploy_website
                ;;
            3)
                deploy_vpn
                ;;
            4)
                deploy_adblocker
                ;;
            5)
                setup_environment
                start_platform
                setup_networking
                create_project_templates
                deploy_website
                deploy_vpn
                deploy_adblocker
                ;;
            6)
                make status
                ;;
            7)
                print_status "Goodbye!"
                exit 0
                ;;
            *)
                print_error "Invalid option. Please choose 1-7."
                ;;
        esac
        echo
        read -p "Press Enter to continue..."
    done
}

# Run main function
main "$@"