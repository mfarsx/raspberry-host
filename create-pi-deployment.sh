#!/bin/bash

# 🍓 Raspberry Pi Deployment Script
# Creates a deployment package for transferring to Raspberry Pi

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Create deployment directory
create_deployment_package() {
    print_header "Creating Raspberry Pi Deployment Package"
    
    DEPLOY_DIR="pi-deployment-$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$DEPLOY_DIR"
    
    print_status "Created deployment directory: $DEPLOY_DIR"
    
    # Copy essential files
    print_status "Copying essential files..."
    
    # Core platform files
    cp -r api "$DEPLOY_DIR/"
    cp -r web "$DEPLOY_DIR/"
    cp -r scripts "$DEPLOY_DIR/"
    cp -r examples "$DEPLOY_DIR/"
    
    # Configuration files
    cp docker-compose.yml "$DEPLOY_DIR/"
    cp docker-compose.dev.yml "$DEPLOY_DIR/"
    cp docker-compose.mac.yml "$DEPLOY_DIR/"
    cp Caddyfile "$DEPLOY_DIR/"
    cp Makefile "$DEPLOY_DIR/"
    cp .env.example "$DEPLOY_DIR/"
    
    # Documentation
    cp README.md "$DEPLOY_DIR/"
    cp PROJECT_TODO.md "$DEPLOY_DIR/"
    cp DEPLOYMENT_GUIDE.md "$DEPLOY_DIR/"
    cp MULTI_PROJECT_SETUP.md "$DEPLOY_DIR/"
    cp MACOS_DEVELOPMENT_GUIDE.md "$DEPLOY_DIR/"
    
    # Setup scripts
    cp setup-pi-projects.sh "$DEPLOY_DIR/"
    
    print_status "Files copied successfully"
}

# Create Pi-specific configurations
create_pi_configs() {
    print_header "Creating Pi-Specific Configurations"
    
    # Create production .env template
    cat > "$DEPLOY_DIR/.env.pi" << 'EOF'
# Raspberry Pi Production Configuration
DOMAIN=yourdomain.com
TLS_EMAIL=your-email@example.com

# Application Environment
NODE_ENV=production
PORT=3001
LOG_LEVEL=info

# Database Configuration
MONGO_URL=mongodb://pi_user:${MONGO_PASSWORD}@mongodb:27017/pi_app?authSource=pi_app
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=your-secure-mongo-password
MONGO_DATABASE=pi_app
MONGO_PASSWORD=your-secure-mongo-password

# Redis Configuration
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379
REDIS_PASSWORD=your-secure-redis-password

# Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
CORS_ORIGIN=https://yourdomain.com

# Frontend Configuration
REACT_APP_API_URL=https://yourdomain.com/api
REACT_APP_WS_URL=wss://yourdomain.com/ws
REACT_APP_ENV=production

# Backup Configuration
BACKUP_RETENTION_DAYS=30
BACKUP_SCHEDULE=0 2 * * *

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090

# Development (set to false for production)
DEV_MODE=false
EOF

    # Create Pi setup script
    cat > "$DEPLOY_DIR/setup-pi.sh" << 'EOF'
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
EOF

    chmod +x "$DEPLOY_DIR/setup-pi.sh"
    
    # Create quick deployment script
    cat > "$DEPLOY_DIR/deploy-projects.sh" << 'EOF'
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
EOF

    chmod +x "$DEPLOY_DIR/deploy-projects.sh"
    
    print_status "Pi-specific configurations created"
}

# Create transfer instructions
create_transfer_instructions() {
    print_header "Creating Transfer Instructions"
    
    cat > "$DEPLOY_DIR/TRANSFER_INSTRUCTIONS.md" << 'EOF'
# 🍓 Raspberry Pi Transfer Instructions

## 📦 Transfer Methods

### Method 1: Git Clone (Recommended)
```bash
# On your Raspberry Pi
git clone https://github.com/mfarsx/raspberry-host.git
cd raspberry-host
```

### Method 2: SCP Transfer
```bash
# From your Mac
scp -r pi-deployment-YYYYMMDD_HHMMSS pi@your-pi-ip:~/

# On your Pi
cd pi-deployment-YYYYMMDD_HHMMSS
```

### Method 3: USB Transfer
1. Copy the deployment directory to USB drive
2. Mount USB on Pi
3. Copy files to Pi

## 🚀 Setup on Raspberry Pi

### 1. Run Setup Script
```bash
chmod +x setup-pi.sh
./setup-pi.sh
```

### 2. Configure Environment
Edit `.env` file with your settings:
- `DOMAIN=yourdomain.com`
- `TLS_EMAIL=your-email@example.com`
- `MONGO_ROOT_PASSWORD=your-secure-password`
- `REDIS_PASSWORD=your-secure-password`
- `JWT_SECRET=your-super-secret-key`

### 3. Start Platform
```bash
make up
```

### 4. Deploy Projects
```bash
chmod +x deploy-projects.sh
./deploy-projects.sh
```

## 🌐 Domain Setup

### DNS Configuration
Create these DNS records:
```
yourdomain.com          A    YOUR_PI_IP
website.yourdomain.com  A    YOUR_PI_IP
vpn.yourdomain.com      A    YOUR_PI_IP
adblock.yourdomain.com  A    YOUR_PI_IP
```

### Router Configuration
Forward these ports to your Pi:
```
80    → Pi (HTTP)
443   → Pi (HTTPS)
51820 → Pi (WireGuard VPN)
53    → Pi (DNS - optional)
```

## 📊 Access Your Services

After setup, access your services at:
- **🏠 Main Platform**: `https://yourdomain.com`
- **🌐 Website**: `https://website.yourdomain.com`
- **🔒 VPN**: `https://vpn.yourdomain.com`
- **🛡️ Adblocker**: `https://adblock.yourdomain.com`

## 🔧 Management

### Web Interface
- **Dashboard**: Monitor all projects
- **Deploy**: Add new projects
- **Projects**: Manage existing projects
- **System**: View system information

### Command Line
```bash
# Check status
make status

# View logs
make logs

# Restart services
make restart

# Backup data
make backup
```

## 🚨 Troubleshooting

### Common Issues
1. **SSL Certificate Issues**: Check Caddy logs
2. **VPN Connection Issues**: Verify port forwarding
3. **Adblocker Not Working**: Check DNS settings
4. **Service Won't Start**: Check Docker logs

### Useful Commands
```bash
# Check all containers
docker ps

# Check resource usage
docker stats

# View specific logs
docker logs CONTAINER_NAME

# Restart specific service
docker restart CONTAINER_NAME
```

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check README.md and guides
- **Community**: Join discussions for help

---

**🎉 Congratulations!** You now have a complete self-hosted platform running multiple services on your Raspberry Pi!
EOF

    print_status "Transfer instructions created"
}

# Create archive
create_archive() {
    print_header "Creating Deployment Archive"
    
    ARCHIVE_NAME="raspberry-host-deployment-$(date +%Y%m%d_%H%M%S).tar.gz"
    
    print_status "Creating archive: $ARCHIVE_NAME"
    tar -czf "$ARCHIVE_NAME" "$DEPLOY_DIR"
    
    print_status "Archive created: $ARCHIVE_NAME"
    print_status "Size: $(du -h "$ARCHIVE_NAME" | cut -f1)"
}

# Main execution
main() {
    print_header "🍓 Raspberry Pi Deployment Package Creator"
    
    create_deployment_package
    create_pi_configs
    create_transfer_instructions
    create_archive
    
    print_header "✅ Deployment Package Ready!"
    print_status "Archive: raspberry-host-deployment-$(date +%Y%m%d_%H%M%S).tar.gz"
    print_status "Directory: $DEPLOY_DIR"
    print_status ""
    print_status "Next steps:"
    print_status "1. Transfer archive to your Raspberry Pi"
    print_status "2. Extract: tar -xzf raspberry-host-deployment-*.tar.gz"
    print_status "3. Run: cd pi-deployment-* && ./setup-pi.sh"
    print_status "4. Configure .env file with your settings"
    print_status "5. Start platform: make up"
    print_status "6. Deploy projects through web interface"
}

# Run main function
main "$@"