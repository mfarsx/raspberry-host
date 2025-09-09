#!/bin/bash

# 🍓 Raspberry Pi Hosting Platform - Production Deployment Script
# This script deploys the platform in production mode with proper security

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        print_error "This script should not be run as root for security reasons"
        exit 1
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
    
    # Check if .env file exists
    if [[ ! -f .env ]]; then
        print_warning ".env file not found. Creating from template..."
        cp .env.production .env
        print_warning "Please edit .env file with your configuration before continuing."
        print_warning "Required: DOMAIN, TLS_EMAIL, MONGO_ROOT_PASSWORD, REDIS_PASSWORD, JWT_SECRET"
        read -p "Press Enter after editing .env file..."
    fi
    
    print_status "All prerequisites are met!"
}

# Validate environment variables
validate_environment() {
    print_header "Validating Environment Configuration"
    
    # Source environment variables
    set -a
    source .env
    set +a
    
    # Check required variables
    local missing_vars=()
    
    if [[ -z "$DOMAIN" ]] || [[ "$DOMAIN" == "yourdomain.com" ]]; then
        missing_vars+=("DOMAIN")
    fi
    
    if [[ -z "$TLS_EMAIL" ]] || [[ "$TLS_EMAIL" == "your-email@example.com" ]]; then
        missing_vars+=("TLS_EMAIL")
    fi
    
    if [[ -z "$MONGO_ROOT_PASSWORD" ]] || [[ "$MONGO_ROOT_PASSWORD" == "your-secure-mongo-root-password-here" ]]; then
        missing_vars+=("MONGO_ROOT_PASSWORD")
    fi
    
    if [[ -z "$REDIS_PASSWORD" ]] || [[ "$REDIS_PASSWORD" == "your-secure-redis-password-here" ]]; then
        missing_vars+=("REDIS_PASSWORD")
    fi
    
    if [[ -z "$JWT_SECRET" ]] || [[ "$JWT_SECRET" == "your-super-secret-jwt-key-change-this-in-production-minimum-32-characters" ]]; then
        missing_vars+=("JWT_SECRET")
    fi
    
    if [[ ${#missing_vars[@]} -gt 0 ]]; then
        print_error "Missing or invalid environment variables:"
        for var in "${missing_vars[@]}"; do
            echo "  - $var"
        done
        print_warning "Please update .env file with proper values"
        exit 1
    fi
    
    # Validate JWT secret length
    if [[ ${#JWT_SECRET} -lt 32 ]]; then
        print_error "JWT_SECRET must be at least 32 characters long"
        exit 1
    fi
    
    print_status "Environment configuration is valid!"
}

# Update MongoDB init script with actual password
update_mongo_init() {
    print_header "Updating MongoDB Initialization Script"
    
    # Replace placeholder password with actual password
    sed -i.bak "s/your-secure-mongo-password-here/$MONGO_PASSWORD/g" scripts/mongo-init.js
    
    print_status "MongoDB initialization script updated!"
}

# Create necessary directories
create_directories() {
    print_header "Creating Directories"
    
    mkdir -p logs backups scripts projects
    mkdir -p api/logs api/uploads
    
    print_status "Directories created!"
}

# Build and start services
deploy_services() {
    print_header "Deploying Services"
    
    print_status "Building Docker images..."
    docker compose -f docker-compose.production.yml build --no-cache
    
    print_status "Starting services..."
    docker compose -f docker-compose.production.yml up -d
    
    print_status "Waiting for services to be ready..."
    sleep 30
    
    print_status "Checking service health..."
    docker compose -f docker-compose.production.yml ps
}

# Setup system services
setup_system_services() {
    print_header "Setting Up System Services"
    
    # Create systemd service file
    sudo tee /etc/systemd/system/raspberry-host.service > /dev/null << EOF
[Unit]
Description=Raspberry Pi Hosting Platform
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/docker compose -f docker-compose.production.yml up -d
ExecStop=/usr/bin/docker compose -f docker-compose.production.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start the service
    sudo systemctl daemon-reload
    sudo systemctl enable raspberry-host.service
    
    print_status "System service created and enabled!"
}

# Setup monitoring
setup_monitoring() {
    print_header "Setting Up Monitoring"
    
    # Create log rotation configuration
    sudo tee /etc/logrotate.d/raspberry-host > /dev/null << EOF
$(pwd)/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 $(whoami) $(whoami)
}
EOF

    print_status "Log rotation configured!"
}

# Setup firewall
setup_firewall() {
    print_header "Setting Up Firewall"
    
    # Enable UFW if not already enabled
    if ! sudo ufw status | grep -q "Status: active"; then
        sudo ufw --force enable
    fi
    
    # Allow necessary ports
    sudo ufw allow 22/tcp    # SSH
    sudo ufw allow 80/tcp    # HTTP
    sudo ufw allow 443/tcp   # HTTPS
    
    print_status "Firewall configured!"
}

# Create backup script
create_backup_script() {
    print_header "Creating Backup Script"
    
    cat > backup.sh << 'EOF'
#!/bin/bash

# Backup script for Raspberry Pi Hosting Platform
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Backup MongoDB
docker compose -f docker-compose.production.yml exec -T mongodb mongodump --out /tmp/backup/mongodb
docker compose -f docker-compose.production.yml cp mongodb:/tmp/backup/mongodb "$BACKUP_DIR/"

# Backup Redis
docker compose -f docker-compose.production.yml exec -T redis redis-cli BGSAVE
docker compose -f docker-compose.production.yml cp redis:/data/dump.rdb "$BACKUP_DIR/"

# Backup application data
cp -r api/uploads "$BACKUP_DIR/" 2>/dev/null || true
cp -r api/logs "$BACKUP_DIR/" 2>/dev/null || true

# Create archive
tar -czf "$BACKUP_DIR.tar.gz" "$BACKUP_DIR"
rm -rf "$BACKUP_DIR"

echo "Backup created: $BACKUP_DIR.tar.gz"
EOF

    chmod +x backup.sh
    
    # Add to crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $(pwd)/backup.sh") | crontab -
    
    print_status "Backup script created and scheduled!"
}

# Main deployment function
main() {
    print_header "🍓 Raspberry Pi Hosting Platform - Production Deployment"
    
    check_root
    check_prerequisites
    validate_environment
    update_mongo_init
    create_directories
    deploy_services
    setup_system_services
    setup_monitoring
    setup_firewall
    create_backup_script
    
    print_header "✅ Production Deployment Complete!"
    print_status "Platform is now running at: https://$DOMAIN"
    print_status "Services:"
    print_status "  - Web Interface: https://$DOMAIN"
    print_status "  - API: https://$DOMAIN/api"
    print_status "  - WebSocket: wss://$DOMAIN/ws"
    print_status ""
    print_status "Management commands:"
    print_status "  - View logs: docker compose -f docker-compose.production.yml logs"
    print_status "  - Check status: docker compose -f docker-compose.production.yml ps"
    print_status "  - Restart: docker compose -f docker-compose.production.yml restart"
    print_status "  - Backup: ./backup.sh"
    print_status ""
    print_status "System service:"
    print_status "  - Start: sudo systemctl start raspberry-host"
    print_status "  - Stop: sudo systemctl stop raspberry-host"
    print_status "  - Status: sudo systemctl status raspberry-host"
}

# Run main function
main "$@"