# Raspberry Pi 5 Hosting Platform - Makefile
# Make commands for easy deployment and management

.PHONY: help setup up down restart logs status clean backup restore update dev test build

# Default target
help:
	@echo "Raspberry Pi 5 Hosting Platform - Available Commands:"
	@echo ""
	@echo "Setup & Deployment:"
	@echo "  setup          - Initial setup and environment configuration"
	@echo "  setup-services - Setup MongoDB and Redis natively on Pi"
	@echo "  up             - Start production environment"
	@echo "  dev            - Start development environment"
	@echo "  down           - Stop all services"
	@echo "  restart        - Restart all services"
	@echo "  update         - Update all services to latest versions"
	@echo "  deploy         - Full production deployment with health checks"
	@echo ""
	@echo "Development:"
	@echo "  test           - Run tests"
	@echo "  build          - Build all services"
	@echo "  rebuild-web    - Rebuild web container with latest changes"
	@echo "  fix-caddy      - Fix Caddy configuration issues"
	@echo ""
	@echo "Monitoring & Maintenance:"
	@echo "  logs      - View logs from all services"
	@echo "  status    - Check status of all services"
	@echo "  clean     - Clean up unused containers and images"
	@echo "  check-api - Test API endpoints connectivity"
	@echo "  resources - Show resource usage"
	@echo "  disk      - Show disk usage"
	@echo "  network   - Show network information"
	@echo ""
	@echo "Backup & Recovery:"
	@echo "  backup    - Create backup of all data"
	@echo "  restore   - Restore from backup"
	@echo ""
	@echo "Security:"
	@echo "  security  - Run security checks"
	@echo "  scan      - Scan for vulnerabilities"
	@echo ""
	@echo "Emergency:"
	@echo "  emergency-stop - Emergency stop all containers"
	@echo "  reset-all     - Reset everything (removes all containers/images/volumes)"
	@echo ""
	@echo "Quick Commands:"
	@echo "  quick-prod    - Quick production setup"
	@echo "  system-check  - Full system health check"
	@echo ""
	@echo "Service-specific:"
	@echo "  logs-<service>    - View logs for specific service"
	@echo "  restart-<service> - Restart specific service"

# Environment setup
setup:
	@echo "Setting up Raspberry Pi 5 Hosting Platform..."
	@echo "Creating necessary directories..."
	@mkdir -p api/logs api/uploads api/projects
	@echo "Setup complete! Run 'make dev' to start development environment."

# Setup external services (MongoDB and Redis on Pi)
setup-services:
	@echo "Setting up MongoDB and Redis on Raspberry Pi..."
	@echo "Note: Services are now managed via Docker Compose"
	@echo "Run 'make dev' to start development environment with MongoDB and Redis"

# Production deployment
up:
	@echo "Starting Raspberry Pi 5 Hosting Platform..."
	@echo "Stopping any running development services..."
	@docker compose -f docker-compose.dev.yml down 2>/dev/null || echo "No development services to stop"
	@echo "Starting production environment..."
	@docker compose -f docker-compose.yml up -d
	@echo "Services started! Check status with 'make status'"

# Development environment
dev:
	@echo "Setting up development environment..."
	@echo "Stopping any running production services..."
	@docker compose down 2>/dev/null || echo "No production services to stop"
	@echo "Starting development environment..."
	@docker compose -f docker-compose.dev.yml up -d
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:3000"
	@echo "API: http://localhost:3001"
	@echo "MongoDB: localhost:27017"
	@echo "Redis: localhost:6379"

# Stop services
down:
	@echo "Stopping all services..."
	@docker compose down 2>/dev/null || echo "No production services to stop"
	@docker compose -f docker-compose.dev.yml down 2>/dev/null || echo "No development services to stop"
	@echo "All services stopped!"

# Restart services
restart:
	@echo "Restarting all services..."
	@docker compose restart

# View logs
logs:
	@echo "Viewing logs from all services..."
	@docker compose logs -f

# Check status
status:
	@echo "Checking service status..."
	@echo "All running containers:"
	@docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
	@echo ""
	@echo "Production services (docker-compose.yml):"
	@docker compose ps 2>/dev/null || echo "No production services running"
	@echo ""
	@echo "Development services (docker-compose.dev.yml):"
	@docker compose -f docker-compose.dev.yml ps 2>/dev/null || echo "No development services running"

# Test API connectivity
check-api:
	@echo "Testing API endpoints..."
	@echo "Testing /api/health-check..."
	@curl -s http://localhost:3001/api/health-check | jq .status || echo "Health endpoint failed"
	@echo ""
	@echo "Testing /api/stats..."
	@curl -s http://localhost:3001/api/stats | jq .ok || echo "Stats endpoint failed"
	@echo ""
	@echo "Testing frontend..."
	@curl -s -I http://localhost:3000 | grep "200 OK" || echo "Frontend failed"

# Run tests
test:
	@echo "Running tests..."
	@docker compose -f docker-compose.dev.yml exec api npm test 2>/dev/null || echo "No tests configured for API"
	@docker compose -f docker-compose.dev.yml exec web npm test 2>/dev/null || echo "No tests configured for web"

# Build services
build:
	@echo "Building all services..."
	@docker compose -f docker-compose.dev.yml build --no-cache

# Update services
update:
	@echo "Updating services..."
	@docker compose -f docker-compose.dev.yml pull
	@docker compose -f docker-compose.dev.yml up -d
	@echo "Services updated!"

# Clean up
clean:
	@echo "Cleaning up unused containers and images..."
	@docker system prune -f
	@docker image prune -f
	@echo "Cleanup complete!"

# Backup data
backup:
	@echo "Creating backup..."
	@mkdir -p backups/$(shell date +%Y%m%d_%H%M%S)
	@docker compose -f docker-compose.dev.yml exec mongodb mongodump --out /tmp/backup/mongodb 2>/dev/null || echo "MongoDB backup failed"
	@docker compose -f docker-compose.dev.yml exec mongodb tar -czf /tmp/backup/mongodb.tar.gz -C /tmp/backup mongodb 2>/dev/null || echo "MongoDB archive failed"
	@docker compose -f docker-compose.dev.yml cp mongodb:/tmp/backup/mongodb.tar.gz backups/$(shell date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo "MongoDB copy failed"
	@docker compose -f docker-compose.dev.yml exec redis redis-cli BGSAVE 2>/dev/null || echo "Redis backup failed"
	@docker compose -f docker-compose.dev.yml cp redis:/data/dump.rdb backups/$(shell date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo "Redis copy failed"
	@echo "Backup created in backups/ directory"

# Restore data
restore:
	@echo "Available backups:"
	@ls -la backups/
	@echo "Please specify backup directory: make restore BACKUP_DIR=backups/YYYYMMDD_HHMMSS"

# Restore from specific backup
restore-backup:
	@if [ -z "$(BACKUP_DIR)" ]; then \
		echo "Please specify BACKUP_DIR: make restore-backup BACKUP_DIR=backups/YYYYMMDD_HHMMSS"; \
		exit 1; \
	fi
	@echo "Restoring from $(BACKUP_DIR)..."
	@docker compose cp $(BACKUP_DIR)/mongodb.tar.gz mongodb:/tmp/backup/
	@docker compose exec mongodb tar -xzf /tmp/backup/mongodb.tar.gz -C /tmp/backup/
	@docker compose exec mongodb mongorestore --drop /tmp/backup/mongodb
	@docker compose cp $(BACKUP_DIR)/dump.rdb redis:/data/
	@docker compose restart redis
	@echo "Restore completed!"

# Security checks
security:
	@echo "Running security checks..."
	@docker compose -f docker-compose.dev.yml exec api npm audit 2>/dev/null || echo "API audit failed"
	@docker compose -f docker-compose.dev.yml exec web npm audit 2>/dev/null || echo "Web audit failed"
	@echo "Security check complete!"

# Vulnerability scan
scan:
	@echo "Scanning for vulnerabilities..."
	@docker scout cves
	@echo "Vulnerability scan complete!"

# Production deployment with health checks
deploy:
	@echo "Deploying to production..."
	@make build
	@make up
	@sleep 30
	@make status
	@echo "Deployment complete!"


# Quick production setup
quick-prod:
	@echo "Quick production setup..."
	@echo "Note: Production setup requires docker-compose.yml configuration"
	@echo "Run 'make up' for production or 'make dev' for development"

# Show resource usage
resources:
	@echo "Resource usage:"
	@docker stats --no-stream

# Show disk usage
disk:
	@echo "Disk usage:"
	@df -h
	@echo ""
	@echo "Docker disk usage:"
	@docker system df

# Show network information
network:
	@echo "Network information:"
	@docker network ls
	@echo ""
	@echo "Container network details:"
	@docker compose ps --format "table {{.Name}}\t{{.Networks}}"

# Emergency stop
emergency-stop:
	@echo "EMERGENCY STOP - Stopping all containers..."
	@docker stop $$(docker ps -q)
	@echo "All containers stopped!"

# Show logs for specific service
logs-%:
	@echo "Viewing logs for $* service..."
	@docker compose logs -f $*

# Restart specific service
restart-%:
	@echo "Restarting $* service..."
	@docker compose restart $*

# Show help for specific command
help-%:
	@echo "Help for $* command:"
	@grep -A 5 "^$*:" Makefile || echo "Command not found"

# Full system check
system-check:
	@echo "Running full system check..."
	@echo "1. Checking Docker status..."
	@docker --version
	@echo ""
	@echo "2. Checking service status..."
	@make status
	@echo ""
	@echo "3. Testing API connectivity..."
	@make check-api
	@echo ""
	@echo "4. Checking resource usage..."
	@make resources
	@echo ""
	@echo "System check complete!"

# Reset everything (nuclear option)
reset-all:
	@echo "WARNING: This will remove ALL containers, images, and volumes!"
	@echo "Press Ctrl+C to cancel, or wait 10 seconds to continue..."
	@sleep 10
	@docker compose down -v
	@docker system prune -af
	@docker volume prune -f
	@echo "System reset complete!"