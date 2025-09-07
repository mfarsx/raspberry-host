# Raspberry Pi 5 Hosting Platform - Makefile
# Make commands for easy deployment and management

.PHONY: help setup up down restart logs status clean backup restore update dev test build

# Default target
help:
	@echo "Raspberry Pi 5 Hosting Platform - Available Commands:"
	@echo ""
	@echo "Setup & Deployment:"
	@echo "  setup     - Initial setup and environment configuration"
	@echo "  up        - Start all services in production mode"
	@echo "  down      - Stop all services"
	@echo "  restart   - Restart all services"
	@echo "  update    - Update all services to latest versions"
	@echo ""
	@echo "Development:"
	@echo "  dev       - Start development environment"
	@echo "  test      - Run tests"
	@echo "  build     - Build all services"
	@echo ""
	@echo "Monitoring & Maintenance:"
	@echo "  logs      - View logs from all services"
	@echo "  status    - Check status of all services"
	@echo "  clean     - Clean up unused containers and images"
	@echo ""
	@echo "Backup & Recovery:"
	@echo "  backup    - Create backup of all data"
	@echo "  restore   - Restore from backup"
	@echo ""
	@echo "Security:"
	@echo "  security  - Run security checks"
	@echo "  scan      - Scan for vulnerabilities"

# Environment setup
setup:
	@echo "Setting up Raspberry Pi 5 Hosting Platform..."
	@if [ ! -f .env ]; then \
		echo "Creating .env file from template..."; \
		cp .env.example .env; \
		echo "Please edit .env file with your configuration before running 'make up'"; \
	else \
		echo ".env file already exists"; \
	fi
	@echo "Creating necessary directories..."
	@mkdir -p logs backups scripts
	@echo "Setup complete! Edit .env file and run 'make up' to start services."

# Production deployment
up:
	@echo "Starting Raspberry Pi 5 Hosting Platform..."
	@docker compose up -d
	@echo "Services started! Check status with 'make status'"

# Development environment
dev:
	@echo "Starting development environment..."
	@docker compose -f compose.dev.yaml up -d
	@echo "Development environment started!"
	@echo "Frontend: http://localhost:3000"
	@echo "API: http://localhost:3001"
	@echo "MongoDB: localhost:27017"
	@echo "Redis: localhost:6379"

# Stop services
down:
	@echo "Stopping all services..."
	@docker compose down
	@docker compose -f compose.dev.yaml down

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
	@docker compose ps
	@echo ""
	@echo "Health checks:"
	@docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Run tests
test:
	@echo "Running tests..."
	@docker compose exec api npm test
	@docker compose exec web npm test

# Build services
build:
	@echo "Building all services..."
	@docker compose build --no-cache

# Update services
update:
	@echo "Updating services..."
	@docker compose pull
	@docker compose up -d
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
	@docker compose exec mongodb mongodump --out /tmp/backup/mongodb
	@docker compose exec mongodb tar -czf /tmp/backup/mongodb.tar.gz -C /tmp/backup mongodb
	@docker compose cp mongodb:/tmp/backup/mongodb.tar.gz backups/$(shell date +%Y%m%d_%H%M%S)/
	@docker compose exec redis redis-cli BGSAVE
	@docker compose cp redis:/data/dump.rdb backups/$(shell date +%Y%m%d_%H%M%S)/
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
	@docker compose exec api npm audit
	@docker compose exec web npm audit
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

# Quick development setup
quick-dev:
	@echo "Quick development setup..."
	@cp .env.example .env
	@sed -i 's/NODE_ENV=production/NODE_ENV=development/' .env
	@sed -i 's/DEV_MODE=false/DEV_MODE=true/' .env
	@make dev

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

# Show help for specific command
help-%:
	@echo "Help for $* command:"
	@grep -A 5 "^$*:" Makefile || echo "Command not found"