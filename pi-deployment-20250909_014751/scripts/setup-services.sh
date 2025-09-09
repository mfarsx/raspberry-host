#!/bin/bash

# Raspberry Pi 5 Hosting Platform - Services Setup Script
# This script installs and configures MongoDB and Redis natively on the Pi

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
MONGO_VERSION="7.0"
REDIS_VERSION="7.2"
MONGO_DB_NAME="pi_app"
MONGO_USERNAME="pi_user"
REDIS_USERNAME="pi_user"

echo -e "${BLUE}🚀 Raspberry Pi 5 Hosting Platform - Services Setup${NC}"
echo "=================================================="

# Function to generate secure password
generate_password() {
    openssl rand -base64 32 | tr -d "=+/" | cut -c1-25
}

# Function to check if service is running
check_service() {
    systemctl is-active --quiet $1
}

# Function to restart service
restart_service() {
    echo -e "${YELLOW}Restarting $1...${NC}"
    sudo systemctl restart $1
    sudo systemctl enable $1
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}This script should not be run as root${NC}"
   exit 1
fi

# Check if we're on Raspberry Pi OS
if ! grep -q "Raspberry Pi OS" /etc/os-release 2>/dev/null; then
    echo -e "${YELLOW}Warning: This script is optimized for Raspberry Pi OS${NC}"
fi

echo -e "${BLUE}📋 Step 1: Updating system packages${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${BLUE}📋 Step 2: Installing MongoDB ${MONGO_VERSION}${NC}"
# Add MongoDB GPG key and repository
wget -qO - https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc | sudo apt-key add -
echo "deb [ arch=arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/${MONGO_VERSION} multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Configure MongoDB
echo -e "${BLUE}📋 Step 3: Configuring MongoDB${NC}"
sudo mkdir -p /var/log/mongodb
sudo mkdir -p /var/lib/mongodb
sudo chown mongodb:mongodb /var/log/mongodb
sudo chown mongodb:mongodb /var/lib/mongodb

# Create MongoDB configuration
sudo tee /etc/mongod.conf > /dev/null <<EOF
# MongoDB Configuration for Raspberry Pi 5 Hosting Platform
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.5  # Limit cache for Pi's memory

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log
  logRotate: reopen

net:
  port: 27017
  bindIp: 127.0.0.1,::1
  maxIncomingConnections: 100

processManagement:
  timeZoneInfo: /usr/share/zoneinfo

security:
  authorization: enabled

operationProfiling:
  slowOpThresholdMs: 100
  mode: slowOp

replication:
  replSetName: "pi-replica-set"
EOF

# Start MongoDB
restart_service mongod

echo -e "${BLUE}📋 Step 4: Installing Redis ${REDIS_VERSION}${NC}"
# Install Redis
sudo apt install -y redis-server

# Configure Redis
echo -e "${BLUE}📋 Step 5: Configuring Redis${NC}"
sudo tee /etc/redis/redis.conf > /dev/null <<EOF
# Redis Configuration for Raspberry Pi 5 Hosting Platform
bind 127.0.0.1 ::1
port 6379
timeout 0
keepalive 300

# Memory management
maxmemory 256mb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# Logging
loglevel notice
logfile /var/log/redis/redis-server.log

# Security
protected-mode yes
tcp-backlog 511

# Performance
tcp-keepalive 300
databases 16
EOF

# Create Redis log directory
sudo mkdir -p /var/log/redis
sudo chown redis:redis /var/log/redis

# Start Redis
restart_service redis-server

echo -e "${BLUE}📋 Step 6: Generating secure credentials${NC}"
# Generate passwords
MONGO_PASSWORD=$(generate_password)
REDIS_PASSWORD=$(generate_password)

echo -e "${BLUE}📋 Step 7: Setting up MongoDB authentication${NC}"
# Wait for MongoDB to start
sleep 5

# Create MongoDB user
mongosh --eval "
use ${MONGO_DB_NAME};
db.createUser({
  user: '${MONGO_USERNAME}',
  pwd: '${MONGO_PASSWORD}',
  roles: [
    { role: 'readWrite', db: '${MONGO_DB_NAME}' }
  ]
});
"

# Create initial collections
mongosh --eval "
use ${MONGO_DB_NAME};
db.createCollection('users');
db.createCollection('sessions');
db.createCollection('applications');
db.createCollection('logs');
db.createCollection('config');

// Create indexes
db.users.createIndex({ 'email': 1 }, { unique: true });
db.users.createIndex({ 'username': 1 }, { unique: true });
db.sessions.createIndex({ 'token': 1 }, { unique: true });
db.sessions.createIndex({ 'expiresAt': 1 }, { expireAfterSeconds: 0 });
db.applications.createIndex({ 'name': 1 });
db.logs.createIndex({ 'timestamp': 1 });

// Insert initial admin user
db.users.insertOne({
  username: 'admin',
  email: 'admin@localhost',
  password: '\$2b\$10\$rQZ8K9vJ8K9vJ8K9vJ8K9e', // bcrypt hash for 'admin123'
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date()
});

// Insert system configuration
db.config.insertOne({
  key: 'system',
  value: {
    version: '1.0.0',
    initialized: true,
    initializedAt: new Date(),
    features: {
      websocket: true,
      authentication: true,
      monitoring: true,
      backup: true
    }
  },
  createdAt: new Date(),
  updatedAt: new Date()
});

print('MongoDB setup completed successfully!');
"

echo -e "${BLUE}📋 Step 8: Setting up Redis authentication${NC}"
# Set Redis password
redis-cli CONFIG SET requirepass "${REDIS_PASSWORD}"

# Make Redis password persistent
echo "requirepass ${REDIS_PASSWORD}" | sudo tee -a /etc/redis/redis.conf

# Restart Redis to apply password
restart_service redis-server

echo -e "${BLUE}📋 Step 9: Creating environment file${NC}"
# Create .env file with credentials
cat > .env <<EOF
# Raspberry Pi 5 Hosting Platform - Environment Configuration
# Generated by setup-services.sh

# Domain Configuration
DOMAIN=localhost
TLS_EMAIL=admin@localhost

# Application Configuration
NODE_ENV=production
PORT=3001
LOG_LEVEL=info
DEV_MODE=false

# Database Configuration (Native Installation)
MONGO_URL=mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@localhost:27017/${MONGO_DB_NAME}
MONGO_ROOT_USERNAME=admin
MONGO_ROOT_PASSWORD=${MONGO_PASSWORD}
MONGO_DATABASE=${MONGO_DB_NAME}

# Redis Configuration (Native Installation)
REDIS_URL=redis://:${REDIS_PASSWORD}@localhost:6379
REDIS_PASSWORD=${REDIS_PASSWORD}

# Security Configuration
JWT_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
CORS_ORIGIN=https://localhost

# Security Headers
ENABLE_SECURITY_HEADERS=true
EOF

echo -e "${GREEN}✅ Services setup completed successfully!${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
echo "MongoDB: $(check_service mongod && echo '✅ Running' || echo '❌ Not running')"
echo "Redis: $(check_service redis-server && echo '✅ Running' || echo '❌ Not running')"
echo ""
echo -e "${BLUE}🔐 Generated Credentials:${NC}"
echo "MongoDB Username: ${MONGO_USERNAME}"
echo "MongoDB Password: ${MONGO_PASSWORD}"
echo "Redis Password: ${REDIS_PASSWORD}"
echo ""
echo -e "${BLUE}📁 Configuration Files:${NC}"
echo "MongoDB Config: /etc/mongod.conf"
echo "Redis Config: /etc/redis/redis.conf"
echo "Environment: .env"
echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "1. Update DOMAIN and TLS_EMAIL in .env file"
echo "2. Run 'make up' to start the hosting platform"
echo "3. Access the platform at https://yourdomain.com"
echo ""
echo -e "${YELLOW}⚠️  Important:${NC}"
echo "- Change the default admin password on first login"
echo "- Update firewall rules if needed"
echo "- Consider setting up SSL certificates for production"

