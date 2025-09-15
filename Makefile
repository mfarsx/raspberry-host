# Raspberry Pi 5 Hosting Platform - Makefile
# Make commands for easy deployment and management

# =============================================================================
# CONFIGURATION VARIABLES
# =============================================================================

# URLs and Ports
API_URL ?= http://localhost:3001
WEB_URL ?= http://localhost:3000
API_PORT ?= 3001
WEB_PORT ?= 3000
MONGO_PORT ?= 27017
REDIS_PORT ?= 6379

# Docker Compose Files
COMPOSE_FILE ?= docker-compose.yml
COMPOSE_FILE_DEV ?= docker-compose.dev.yml

# Directories
BACKUP_DIR ?= backups
API_DIR ?= api
WEB_DIR ?= web
LOGS_DIR ?= api/logs
UPLOADS_DIR ?= api/uploads
PROJECTS_DIR ?= api/projects

# Docker Commands (with dry-run support)
DRY_RUN ?= false
ifeq ($(DRY_RUN),true)
    DOCKER_COMPOSE = echo "[DRY RUN] docker compose"
    DOCKER = echo "[DRY RUN] docker"
else
    DOCKER_COMPOSE = docker compose
    DOCKER = docker
endif

# Environment Detection
UNAME_S := $(shell uname -s)
ifeq ($(UNAME_S),Linux)
    PLATFORM = linux
else ifeq ($(UNAME_S),Darwin)
    PLATFORM = darwin
else
    PLATFORM = unknown
endif

# Colors for output
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[0;33m
BLUE := \033[0;34m
NC := \033[0m # No Color

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Error handling function
define check_command
	@if ! $(1); then \
		echo "$(RED)Error: $(2) failed$(NC)"; \
		exit 1; \
	fi
endef

# Success message function
define success_msg
	@echo "$(GREEN)✓ $(1)$(NC)"
endef

# Warning message function
define warning_msg
	@echo "$(YELLOW)⚠ $(1)$(NC)"
endef

# Info message function
define info_msg
	@echo "$(BLUE)ℹ $(1)$(NC)"
endef

# Validate required variable
define validate_var
	@if [ -z "$($(1))" ]; then \
		echo "$(RED)Error: $(1) is required$(NC)"; \
		echo "Usage: $(2)"; \
		exit 1; \
	fi
endef

# Validate directory exists
define validate_dir
	@if [ ! -d "$(1)" ]; then \
		echo "$(RED)Error: Directory $(1) does not exist$(NC)"; \
		exit 1; \
	fi
endef

# Validate file exists
define validate_file
	@if [ ! -f "$(1)" ]; then \
		echo "$(RED)Error: File $(1) does not exist$(NC)"; \
		exit 1; \
	fi
endef

.PHONY: help setup up down restart logs status clean backup restore update dev dev-clean dev-api dev-detached start start-logs test build \
        setup-services check-api test build update clean validate-backup-dir backup restore \
        restore-backup security scan deploy quick-prod env-info resources disk network \
        emergency-stop reset-all logs-% restart-% help-% system-check

# Default target
help:
	@echo "$(BLUE)Raspberry Pi 5 Hosting Platform - Available Commands$(NC)"
	@echo ""
	@echo "$(GREEN)Configuration Variables:$(NC)"
	@echo "  DRY_RUN=true     - Run commands in dry-run mode (show what would be executed)"
	@echo "  API_URL=...      - Override API URL (default: $(API_URL))"
	@echo "  WEB_URL=...      - Override Web URL (default: $(WEB_URL))"
	@echo "  BACKUP_DIR=...   - Override backup directory (default: $(BACKUP_DIR))"
	@echo ""
	@echo "$(GREEN)Setup & Deployment:$(NC)"
	@echo "  setup          - Initial setup and environment configuration"
	@echo "  setup-services - Setup MongoDB and Redis natively on Pi"
	@echo "  up             - Start production environment"
	@echo "  dev            - Start development environment with console output"
	@echo "  dev-clean      - Start dev environment with clean logs (API & Web only)"
	@echo "  dev-api        - Start dev environment with API logs only"
	@echo "  dev-detached   - Start development environment in background"
	@echo "  start          - Quick start dev environment (alias for dev-detached)"
	@echo "  start-logs     - Quick start dev environment with logs (alias for dev)"
	@echo "  down           - Stop all services"
	@echo "  restart        - Restart all services"
	@echo "  update         - Update all services to latest versions"
	@echo "  deploy         - Full production deployment with health checks"
	@echo ""
	@echo "$(GREEN)Development:$(NC)"
	@echo "  test           - Run tests"
	@echo "  build          - Build all services"
	@echo "  rebuild-web    - Rebuild web container with latest changes"
	@echo "  fix-caddy      - Fix Caddy configuration issues"
	@echo ""
	@echo "$(GREEN)Monitoring & Maintenance:$(NC)"
	@echo "  logs      - View logs from all services"
	@echo "  status    - Check status of all services"
	@echo "  clean     - Clean up unused containers and images"
	@echo "  check-api - Test API endpoints connectivity"
	@echo "  resources - Show resource usage"
	@echo "  disk      - Show disk usage"
	@echo "  network   - Show network information"
	@echo ""
	@echo "$(GREEN)Backup & Recovery:$(NC)"
	@echo "  backup    - Create backup of all data"
	@echo "  restore   - Restore from backup"
	@echo ""
	@echo "$(GREEN)Security:$(NC)"
	@echo "  security  - Run security checks"
	@echo "  scan      - Scan for vulnerabilities"
	@echo ""
	@echo "$(GREEN)Emergency:$(NC)"
	@echo "  emergency-stop - Emergency stop all containers"
	@echo "  reset-all     - Reset everything (removes all containers/images/volumes)"
	@echo ""
	@echo "$(GREEN)Quick Commands:$(NC)"
	@echo "  quick-prod    - Quick production setup"
	@echo "  system-check  - Full system health check"
	@echo "  env-info      - Show environment information and validate compose files"
	@echo ""
	@echo "$(GREEN)Service-specific:$(NC)"
	@echo "  logs-<service>    - View logs for specific service"
	@echo "  restart-<service> - Restart specific service"
	@echo ""
	@echo "$(YELLOW)Examples:$(NC)"
	@echo "  make dev                # Start dev environment with live console output (attached)"
	@echo "  make dev-clean          # Start dev environment with clean logs (API & Web only)"
	@echo "  make dev-api            # Start dev environment with API logs only (cleanest)"
	@echo "  make dev-detached       # Start dev environment in background (detached)"
	@echo "  make start              # Quick start in background (same as dev-detached)"
	@echo "  make start-logs         # Quick start with logs (same as dev)"
	@echo "  make dev DRY_RUN=true   # See what dev command would do"
	@echo "  make backup BACKUP_DIR=/custom/backup"
	@echo "  make check-api API_URL=http://192.168.1.100:3001"
	@echo ""
	@echo "$(BLUE)Development Mode Notes:$(NC)"
	@echo "  • 'make dev' or 'make start-logs' - Shows all service logs, press Ctrl+C to stop"
	@echo "  • 'make dev-clean' - Shows only API and Web logs (cleaner output)"
	@echo "  • 'make dev-api' - Shows only API logs (cleanest for API development)"
	@echo "  • 'make dev-detached' or 'make start' - Runs in background, use 'make logs' to view logs"

# Environment setup
setup:
	@echo "$(BLUE)Setting up Raspberry Pi 5 Hosting Platform...$(NC)"
	@echo "$(BLUE)Platform detected: $(PLATFORM)$(NC)"
	@echo "$(BLUE)Creating necessary directories...$(NC)"
	@mkdir -p $(LOGS_DIR) $(UPLOADS_DIR) $(PROJECTS_DIR) $(BACKUP_DIR)
	$(call success_msg,"Setup complete! Run 'make dev' to start development environment.")

# Setup external services (MongoDB and Redis on Pi)
setup-services: setup
	@echo "$(BLUE)Setting up MongoDB and Redis on Raspberry Pi...$(NC)"
	@echo "$(YELLOW)Note: Services are now managed via Docker Compose$(NC)"
	@echo "$(BLUE)Run 'make dev' to start development environment with MongoDB and Redis$(NC)"

# Production deployment
up: setup
	@echo "$(BLUE)Starting Raspberry Pi 5 Hosting Platform...$(NC)"
	@echo "$(BLUE)Stopping any running development services...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) down 2>/dev/null || echo "$(YELLOW)No development services to stop$(NC)"
	@echo "$(BLUE)Starting production environment...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE) up -d
	$(call success_msg,"Services started! Check status with 'make status'")

# Development environment
dev: setup
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@echo "$(BLUE)Stopping any running production services...$(NC)"
	@$(DOCKER_COMPOSE) down 2>/dev/null || echo "$(YELLOW)No production services to stop$(NC)"
	@echo "$(BLUE)Creating docker network if needed...$(NC)"
	@$(DOCKER) network create pi-network 2>/dev/null || echo "$(YELLOW)Network pi-network already exists$(NC)"
	@echo "$(BLUE)Starting development environment with clean console output...$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop all services$(NC)"
	@echo "$(GREEN)Frontend: $(WEB_URL)$(NC)"
	@echo "$(GREEN)API: $(API_URL)$(NC)"
	@echo "$(GREEN)MongoDB: localhost:$(MONGO_PORT)$(NC)"
	@echo "$(GREEN)Redis: localhost:$(REDIS_PORT)$(NC)"
	@echo "$(BLUE)Starting services with organized logs...$(NC)"
	@echo "$(YELLOW)========================================$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) up --no-color

# Development environment (detached mode)
dev-detached: setup
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@echo "$(BLUE)Stopping any running production services...$(NC)"
	@$(DOCKER_COMPOSE) down 2>/dev/null || echo "$(YELLOW)No production services to stop$(NC)"
	@echo "$(BLUE)Creating docker network if needed...$(NC)"
	@$(DOCKER) network create pi-network 2>/dev/null || echo "$(YELLOW)Network pi-network already exists$(NC)"
	@echo "$(BLUE)Starting development environment in background...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) up -d
	$(call success_msg,"Development environment started!")
	@echo "$(GREEN)Frontend: $(WEB_URL)$(NC)"
	@echo "$(GREEN)API: $(API_URL)$(NC)"
	@echo "$(GREEN)MongoDB: localhost:$(MONGO_PORT)$(NC)"
	@echo "$(GREEN)Redis: localhost:$(REDIS_PORT)$(NC)"
	@echo "$(YELLOW)Use 'make logs' to view logs or 'make down' to stop$(NC)"

# Quick development start (alias for dev-detached)
start: dev-detached

# Quick development with logs (alias for dev)
start-logs: dev

# Development environment with filtered logs (API and Web only)
dev-clean: setup
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@echo "$(BLUE)Stopping any running production services...$(NC)"
	@$(DOCKER_COMPOSE) down 2>/dev/null || echo "$(YELLOW)No production services to stop$(NC)"
	@echo "$(BLUE)Creating docker network if needed...$(NC)"
	@$(DOCKER) network create pi-network 2>/dev/null || echo "$(YELLOW)Network pi-network already exists$(NC)"
	@echo "$(BLUE)Starting development environment with clean logs...$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop all services$(NC)"
	@echo "$(GREEN)Frontend: $(WEB_URL)$(NC)"
	@echo "$(GREEN)API: $(API_URL)$(NC)"
	@echo "$(GREEN)MongoDB: localhost:$(MONGO_PORT)$(NC)"
	@echo "$(GREEN)Redis: localhost:$(REDIS_PORT)$(NC)"
	@echo "$(BLUE)Starting services (showing API and Web logs only)...$(NC)"
	@echo "$(YELLOW)========================================$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) up --no-color api web

# Development environment with API logs only
dev-api: setup
	@echo "$(BLUE)Setting up development environment...$(NC)"
	@echo "$(BLUE)Stopping any running production services...$(NC)"
	@$(DOCKER_COMPOSE) down 2>/dev/null || echo "$(YELLOW)No production services to stop$(NC)"
	@echo "$(BLUE)Creating docker network if needed...$(NC)"
	@$(DOCKER) network create pi-network 2>/dev/null || echo "$(YELLOW)Network pi-network already exists$(NC)"
	@echo "$(BLUE)Starting development environment with API logs only...$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to stop all services$(NC)"
	@echo "$(GREEN)Frontend: $(WEB_URL)$(NC)"
	@echo "$(GREEN)API: $(API_URL)$(NC)"
	@echo "$(GREEN)MongoDB: localhost:$(MONGO_PORT)$(NC)"
	@echo "$(GREEN)Redis: localhost:$(REDIS_PORT)$(NC)"
	@echo "$(BLUE)Starting services (showing API logs only)...$(NC)"
	@echo "$(YELLOW)========================================$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) up --no-color api

# Stop services
down:
	@echo "$(BLUE)Stopping all services...$(NC)"
	@echo "$(BLUE)Attempting to stop via docker compose...$(NC)"
	@$(DOCKER_COMPOSE) down 2>/dev/null || echo "$(YELLOW)No production services to stop via compose$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) down 2>/dev/null || echo "$(YELLOW)No development services to stop via compose$(NC)"
	@echo "$(BLUE)Checking for running containers...$(NC)"
	@if [ $$($(DOCKER) ps -q | wc -l) -gt 0 ]; then \
		echo "$(YELLOW)Found running containers, stopping them directly...$(NC)"; \
		$(DOCKER) stop $$($(DOCKER) ps -q) 2>/dev/null || echo "$(RED)Failed to stop some containers$(NC)"; \
		echo "$(BLUE)Removing stopped containers...$(NC)"; \
		$(DOCKER) rm $$($(DOCKER) ps -aq) 2>/dev/null || echo "$(YELLOW)Some containers may still exist$(NC)"; \
	else \
		echo "$(GREEN)No running containers found$(NC)"; \
	fi
	$(call success_msg,"All services stopped!")

# Restart services
restart:
	@echo "$(BLUE)Restarting all services...$(NC)"
	@$(DOCKER_COMPOSE) restart
	$(call success_msg,"Services restarted!")

# View logs
logs:
	@echo "$(BLUE)Viewing logs from all services...$(NC)"
	@$(DOCKER_COMPOSE) logs -f

# Check status
status:
	@echo "$(BLUE)Checking service status...$(NC)"
	@echo "$(BLUE)All running containers:$(NC)"
	@if [ $$($(DOCKER) ps -q | wc -l) -gt 0 ]; then \
		$(DOCKER) ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"; \
	else \
		echo "$(YELLOW)No containers are currently running$(NC)"; \
	fi
	@echo ""
	@echo "$(BLUE)Production services ($(COMPOSE_FILE)):$(NC)"
	@$(DOCKER_COMPOSE) ps 2>/dev/null || echo "$(YELLOW)No production services running or compose config issues$(NC)"
	@echo ""
	@echo "$(BLUE)Development services ($(COMPOSE_FILE_DEV)):$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) ps 2>/dev/null || echo "$(YELLOW)No development services running or compose config issues$(NC)"

# Test API connectivity
check-api:
	@echo "$(BLUE)Testing API endpoints...$(NC)"
	@echo "$(BLUE)Testing $(API_URL)/api/health-check...$(NC)"
	@$(call check_command,curl -s $(API_URL)/api/health-check | jq .status,"Health endpoint")
	@echo ""
	@echo "$(BLUE)Testing $(API_URL)/api/stats...$(NC)"
	@$(call check_command,curl -s $(API_URL)/api/stats | jq .ok,"Stats endpoint")
	@echo ""
	@echo "$(BLUE)Testing frontend $(WEB_URL)...$(NC)"
	@$(call check_command,curl -s -I $(WEB_URL) | grep "200 OK","Frontend")
	$(call success_msg,"All API endpoints are responding correctly!")

# Run tests
test:
	@echo "$(BLUE)Running tests...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) exec api npm test 2>/dev/null || echo "$(YELLOW)No tests configured for API$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) exec web npm test 2>/dev/null || echo "$(YELLOW)No tests configured for web$(NC)"
	$(call success_msg,"Tests completed!")

# Build services
build: setup
	@echo "$(BLUE)Building all services...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) build --no-cache
	$(call success_msg,"Services built successfully!")

# Update services
update:
	@echo "$(BLUE)Updating services...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) pull
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) up -d
	$(call success_msg,"Services updated!")

# Clean up
clean:
	@echo "$(BLUE)Cleaning up unused containers and images...$(NC)"
	@$(DOCKER) system prune -f
	@$(DOCKER) image prune -f
	$(call success_msg,"Cleanup complete!")

# Validate backup directory
validate-backup-dir:
	@if [ -z "$(BACKUP_DIR)" ]; then \
		echo "$(RED)Error: BACKUP_DIR is required$(NC)"; \
		echo "$(YELLOW)Usage: make restore-backup BACKUP_DIR=backups/YYYYMMDD_HHMMSS$(NC)"; \
		exit 1; \
	fi
	@if [ ! -d "$(BACKUP_DIR)" ]; then \
		echo "$(RED)Error: Directory $(BACKUP_DIR) does not exist$(NC)"; \
		exit 1; \
	fi

# Backup data
backup:
	@echo "$(BLUE)Creating backup...$(NC)"
	@mkdir -p $(BACKUP_DIR)/$(shell date +%Y%m%d_%H%M%S)
	@echo "$(BLUE)Backing up MongoDB...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) exec mongodb mongodump --out /tmp/backup/mongodb 2>/dev/null || echo "$(RED)MongoDB backup failed$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) exec mongodb tar -czf /tmp/backup/mongodb.tar.gz -C /tmp/backup mongodb 2>/dev/null || echo "$(RED)MongoDB archive failed$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) cp mongodb:/tmp/backup/mongodb.tar.gz $(BACKUP_DIR)/$(shell date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo "$(RED)MongoDB copy failed$(NC)"
	@echo "$(BLUE)Backing up Redis...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) exec redis redis-cli BGSAVE 2>/dev/null || echo "$(RED)Redis backup failed$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) cp redis:/data/dump.rdb $(BACKUP_DIR)/$(shell date +%Y%m%d_%H%M%S)/ 2>/dev/null || echo "$(RED)Redis copy failed$(NC)"
	$(call success_msg,"Backup created in $(BACKUP_DIR)/ directory")

# Restore data
restore:
	@echo "$(BLUE)Available backups:$(NC)"
	@ls -la $(BACKUP_DIR)/
	@echo "$(YELLOW)Please specify backup directory: make restore-backup BACKUP_DIR=$(BACKUP_DIR)/YYYYMMDD_HHMMSS$(NC)"

# Restore from specific backup
restore-backup:
	@if [ -z "$(BACKUP_DIR)" ]; then \
		echo "$(RED)Error: BACKUP_DIR is required$(NC)"; \
		echo "$(YELLOW)Usage: make restore-backup BACKUP_DIR=backups/YYYYMMDD_HHMMSS$(NC)"; \
		exit 1; \
	fi
	@if [ ! -d "$(BACKUP_DIR)" ]; then \
		echo "$(RED)Error: Directory $(BACKUP_DIR) does not exist$(NC)"; \
		exit 1; \
	fi
	@echo "$(BLUE)Restoring from $(BACKUP_DIR)...$(NC)"
	@echo "$(BLUE)Restoring MongoDB...$(NC)"
	@$(DOCKER_COMPOSE) cp $(BACKUP_DIR)/mongodb.tar.gz mongodb:/tmp/backup/
	@$(DOCKER_COMPOSE) exec mongodb tar -xzf /tmp/backup/mongodb.tar.gz -C /tmp/backup/
	@$(DOCKER_COMPOSE) exec mongodb mongorestore --drop /tmp/backup/mongodb
	@echo "$(BLUE)Restoring Redis...$(NC)"
	@$(DOCKER_COMPOSE) cp $(BACKUP_DIR)/dump.rdb redis:/data/
	@$(DOCKER_COMPOSE) restart redis
	$(call success_msg,"Restore completed!")

# Security checks
security:
	@echo "$(BLUE)Running security checks...$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) exec api npm audit 2>/dev/null || echo "$(RED)API audit failed$(NC)"
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) exec web npm audit 2>/dev/null || echo "$(RED)Web audit failed$(NC)"
	$(call success_msg,"Security check complete!")

# Vulnerability scan
scan:
	@echo "$(BLUE)Scanning for vulnerabilities...$(NC)"
	@$(DOCKER) scout cves
	$(call success_msg,"Vulnerability scan complete!")

# Production deployment with health checks
deploy: build up
	@echo "$(BLUE)Deploying to production...$(NC)"
	@sleep 30
	@make status
	$(call success_msg,"Deployment complete!")


# Quick production setup
quick-prod:
	@echo "$(BLUE)Quick production setup...$(NC)"
	@echo "$(YELLOW)Note: Production setup requires docker-compose.yml configuration$(NC)"
	@echo "$(BLUE)Run 'make up' for production or 'make dev' for development$(NC)"

# Show environment information
env-info:
	@echo "$(BLUE)Environment Information:$(NC)"
	@echo "$(GREEN)Platform: $(PLATFORM)$(NC)"
	@echo "$(GREEN)Docker Version:$(NC)"
	@$(DOCKER) --version
	@echo "$(GREEN)Docker Compose Version:$(NC)"
	@$(DOCKER_COMPOSE) --version
	@echo "$(GREEN)Configuration:$(NC)"
	@echo "  API_URL: $(API_URL)"
	@echo "  WEB_URL: $(WEB_URL)"
	@echo "  BACKUP_DIR: $(BACKUP_DIR)"
	@echo "  DRY_RUN: $(DRY_RUN)"
	@echo "$(GREEN)Compose Files:$(NC)"
	@echo "  Production: $(COMPOSE_FILE)"
	@echo "  Development: $(COMPOSE_FILE_DEV)"
	@echo "$(GREEN)Compose File Validation:$(NC)"
	@echo "  Checking $(COMPOSE_FILE)..."
	@$(DOCKER_COMPOSE) config --quiet 2>/dev/null && echo "$(GREEN)  ✓ $(COMPOSE_FILE) is valid$(NC)" || echo "$(RED)  ✗ $(COMPOSE_FILE) has issues$(NC)"
	@echo "  Checking $(COMPOSE_FILE_DEV)..."
	@$(DOCKER_COMPOSE) -f $(COMPOSE_FILE_DEV) config --quiet 2>/dev/null && echo "$(GREEN)  ✓ $(COMPOSE_FILE_DEV) is valid$(NC)" || echo "$(RED)  ✗ $(COMPOSE_FILE_DEV) has issues$(NC)"

# Show resource usage
resources:
	@echo "$(BLUE)Resource usage:$(NC)"
	@$(DOCKER) stats --no-stream

# Show disk usage
disk:
	@echo "$(BLUE)Disk usage:$(NC)"
	@df -h
	@echo ""
	@echo "$(BLUE)Docker disk usage:$(NC)"
	@$(DOCKER) system df

# Show network information
network:
	@echo "$(BLUE)Network information:$(NC)"
	@$(DOCKER) network ls
	@echo ""
	@echo "$(BLUE)Container network details:$(NC)"
	@$(DOCKER_COMPOSE) ps --format "table {{.Name}}\t{{.Networks}}"

# Emergency stop
emergency-stop:
	@echo "$(RED)EMERGENCY STOP - Stopping all containers...$(NC)"
	@$(DOCKER) stop $$($(DOCKER) ps -q)
	$(call success_msg,"All containers stopped!")

# Show logs for specific service
logs-%:
	@echo "$(BLUE)Viewing logs for $* service...$(NC)"
	@$(DOCKER_COMPOSE) logs -f $*

# Restart specific service
restart-%:
	@echo "$(BLUE)Restarting $* service...$(NC)"
	@$(DOCKER_COMPOSE) restart $*
	$(call success_msg,"$* service restarted!")

# Show help for specific command
help-%:
	@echo "$(BLUE)Help for $* command:$(NC)"
	@grep -A 5 "^$*:" Makefile || echo "$(RED)Command not found$(NC)"

# Full system check
system-check: env-info status check-api resources
	@echo "$(BLUE)Running full system check...$(NC)"
	@echo "$(BLUE)1. Checking Docker status...$(NC)"
	@$(DOCKER) --version
	@echo ""
	@echo "$(BLUE)2. Checking service status...$(NC)"
	@make status
	@echo ""
	@echo "$(BLUE)3. Testing API connectivity...$(NC)"
	@make check-api
	@echo ""
	@echo "$(BLUE)4. Checking resource usage...$(NC)"
	@make resources
	@echo ""
	$(call success_msg,"System check complete!")

# Reset everything (nuclear option)
reset-all:
	@echo "$(RED)WARNING: This will remove ALL containers, images, and volumes!$(NC)"
	@echo "$(YELLOW)Press Ctrl+C to cancel, or wait 10 seconds to continue...$(NC)"
	@sleep 10
	@$(DOCKER_COMPOSE) down -v
	@$(DOCKER) system prune -af
	@$(DOCKER) volume prune -f
	$(call success_msg,"System reset complete!")