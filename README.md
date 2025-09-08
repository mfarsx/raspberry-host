# Raspberry Pi 5 Hosting Platform

A production-ready hosting platform for Raspberry Pi 5 running on ARM64 architecture. This project provides a complete infrastructure to host and deploy web applications on your Raspberry Pi 5 with Docker, automatic HTTPS, and enterprise-grade security.

## Architecture

```
Internet → Caddy (HTTPS) → Express API ↔ MongoDB, Redis
                        → React Static Files
```

## Project Structure

```
raspberry-host/
├── api/                    # Node.js API backend
│   ├── src/               # Source code
│   └── Dockerfile         # Multi-stage container (dev + prod)
├── web/                    # React frontend
│   ├── src/               # Source code
│   └── Dockerfile         # Multi-stage container (dev + prod)
├── docker-compose.yml      # Production environment
├── docker-compose.dev.yml  # Development environment
├── Caddyfile              # Caddy reverse proxy config
├── Makefile               # Build and deployment commands
└── PROJECT_TODO.md        # Project status and tasks
```

## Features

- **Hosting Platform**: Complete infrastructure for hosting web applications
- **Frontend**: React application hosting with modern UI
- **Backend**: Node.js + Express API with WebSocket support
- **Database**: MongoDB with authentication for hosted apps
- **Cache**: Redis for session management and caching
- **Proxy**: Caddy with automatic HTTPS (Let's Encrypt)
- **Containerization**: Docker + Docker Compose for ARM64
- **Security**: Non-root containers, HSTS, rate limiting
- **Monitoring**: Health checks, structured logging
- **Multi-tenancy**: Support for hosting multiple applications

## 🚀 Quick Start

1. **Clone this repository** on your Raspberry Pi 5:
   ```bash
   git clone https://github.com/mfarsx/raspberry-host.git
   cd raspberry-host
   ```

2. **Configure your environment**:
   ```bash
   # Create .env file with your configuration
   cat > .env << EOF
   DOMAIN=yourdomain.com
   TLS_EMAIL=your-email@example.com
   MONGO_ROOT_PASSWORD=your-mongo-password
   REDIS_PASSWORD=your-redis-password
   JWT_SECRET=your-jwt-secret-key
   EOF
   ```

3. **Choose your environment**:

   **Production Environment**
   ```bash
   make setup
   make up
   ```

   **Development Environment**
   ```bash
   make dev
   ```

4. **Services started**:
   - Caddy reverse proxy with automatic HTTPS
   - Node.js API backend
   - React frontend
   - MongoDB database (Docker or native)
   - Redis cache (Docker or native)
   - Watchtower for automatic updates

5. **Access your hosting platform** at `https://yourdomain.com`

6. **Deploy your first project**:
   - Go to `/deploy` in the web interface
   - Enter your Git repository URL
   - Set domain, port, and environment variables
   - Click "Deploy Project"

7. **Manage your projects** at `/projects` - monitor, restart, view logs

## 🎯 What Can You Host?

This platform can host any project that can run in Docker:

### **Web Applications**
- **React/Vue/Angular** - Frontend applications
- **Node.js** - Express, Next.js, Nuxt.js applications
- **Python** - Django, Flask, FastAPI applications
- **PHP** - Laravel, Symfony, WordPress sites
- **Static Sites** - HTML/CSS/JS, Jekyll, Hugo sites

### **APIs & Services**
- **REST APIs** - Any language with HTTP endpoints
- **GraphQL APIs** - Apollo, Hasura, custom GraphQL
- **Microservices** - Containerized services
- **WebSocket Services** - Real-time applications

### **Requirements for Your Project**
- ✅ **Dockerfile** in the root directory
- ✅ **Git repository** (GitHub, GitLab, Bitbucket)
- ✅ **Port configuration** (your app's listening port)
- ✅ **Environment variables** (if needed)

### **Automatic Features**
- 🔒 **SSL Certificates** - Automatic HTTPS for all domains
- 🌐 **Domain Management** - Multiple domains per project
- 📊 **Monitoring** - Health checks and logs
- 🔄 **Auto-restart** - Container restart on failure
- 💾 **Data Persistence** - Volumes for data storage

## 📋 Requirements

### Hardware
- **Raspberry Pi 5** (recommended) or Pi 4B (minimum)
- **8GB RAM** (minimum 4GB)
- **32GB microSD card** (Class 10 or better)
- **Ethernet connection** (recommended for stability)

### Software
- **Raspberry Pi OS Bookworm** (64-bit)
- **Docker** and **Docker Compose**
- **Domain name** pointing to your Pi's IP
- **Router configuration** (ports 80 and 443 forwarded)

### Network
- **Static IP** for your Raspberry Pi (recommended)
- **DNS A/AAAA records** pointing to your Pi
- **Firewall rules** allowing HTTP/HTTPS traffic

## 🎯 Hosting Platform Capabilities

This Raspberry Pi 5 hosting platform provides:

- **🌐 Multi-Domain Hosting**: Host multiple websites on different domains
- **📦 Project Deployment**: Deploy existing websites/projects from Git repositories
- **⚡ Application Hosting**: Host Node.js, Python, PHP, or static sites
- **🗄️ Database Services**: MongoDB and Redis for hosted applications
- **🔒 SSL/TLS Management**: Automatic HTTPS certificates for all domains
- **⚖️ Load Balancing**: Distribute traffic across multiple hosted applications
- **📊 Monitoring Dashboard**: Real-time monitoring for all hosted projects
- **💾 Backup & Restore**: Automated backups for all hosted data
- **🔧 Management Panel**: Web interface to manage hosted projects
- **🚀 One-Click Deploy**: Deploy projects with simple commands

## 📊 Project Status

This project is **production-ready** and fully functional! We've completed the core hosting platform infrastructure:

### ✅ Completed Phases: Core Infrastructure (Phase 1-4)
- [x] **Docker Compose configuration** - ARM64 optimized with health checks
- [x] **Caddy reverse proxy setup** - Automatic HTTPS with Let's Encrypt
- [x] **MongoDB and Redis configuration** - With authentication and persistence
- [x] **Complete API and frontend** - React dashboard with WebSocket support
- [x] **Project deployment system** - Deploy from Git repositories with Docker
- [x] **Multi-domain hosting** - Host multiple websites with SSL
- [x] **Environment management** - Configure projects with variables
- [x] **Real-time monitoring** - Live project status and logs
- [x] **Project lifecycle management** - Start/stop/restart/delete projects
- [x] **Container isolation** - Separate containers per project

### 🚀 Current Status: Production Ready
- **Phase 1-4**: Core Infrastructure ✅ **COMPLETED**
- **Phase 5-6**: Advanced Monitoring & Security 🔄 **IN PROGRESS**
- **Phase 7-9**: Enterprise Features 📋 **PLANNED**

### 🎯 Progress Tracking
See our [Project TODO](PROJECT_TODO.md) for detailed task breakdown and current status.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### For Developers
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow our development workflow**:
   - Check the [Project TODO](PROJECT_TODO.md) for available tasks
   - Create a GitHub issue for your task
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to your branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Workflow
- **Issues**: Create GitHub issues for bugs and feature requests
- **Labels**: Use labels for priority, phase, and status tracking
- **Code Review**: All changes require review before merging
- **Testing**: Run `make test` before submitting changes

### For Users
- **Report bugs** by creating GitHub issues
- **Request features** by creating GitHub issues
- **Ask questions** in GitHub Discussions
- **Share your setup** and experiences

## 📚 Documentation

### Quick Links
- [📋 Project TODO](PROJECT_TODO.md) - Complete task breakdown and current status

### Available Commands
Use `make help` to see all available commands:
- **Setup**: `make setup` - Initial environment setup
- **Production**: `make up` - Start production environment
- **Development**: `make dev` - Start development environment with hot reload
- **Monitoring**: `make logs`, `make status` - View logs and status
- **Maintenance**: `make backup`, `make clean` - Backup and cleanup

## 🛠️ Development Setup

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)
- Git

### Local Development
```bash
# Clone the repository
git clone https://github.com/mfarsx/raspberry-host.git
cd raspberry-host

# Set up environment
cat > .env << EOF
DOMAIN=localhost
TLS_EMAIL=dev@localhost
MONGO_ROOT_PASSWORD=dev-password
REDIS_PASSWORD=dev-password
JWT_SECRET=dev-jwt-secret
NODE_ENV=development
DEV_MODE=true
EOF

# Start development environment
make dev

# Run tests
make test

# Build for production
make build
```

## 📈 Roadmap

### ✅ Completed (Core Platform)
- ✅ Complete hosting infrastructure with Docker Compose
- ✅ Multi-domain hosting support with automatic SSL
- ✅ Project deployment from Git repositories
- ✅ React web management dashboard with WebSocket
- ✅ Automatic SSL certificates via Let's Encrypt
- ✅ Real-time monitoring and project logs
- ✅ Docker container management and isolation
- ✅ Environment variable management
- ✅ Project lifecycle management (start/stop/restart/delete)
- ✅ Health checks and container monitoring

### 🔄 In Progress (Phase 5-6)
- **Advanced Monitoring** - System metrics, alerting, dashboards
- **Enhanced Security** - Authentication, RBAC, security headers
- **Backup Automation** - Scheduled backups, disaster recovery
- **Performance Optimization** - Caching, resource optimization

### 🚀 Future Features (Phase 7-9)
- **Multi-tenant Support** - Multiple users/organizations
- **Advanced Scaling** - Load balancing, auto-scaling
- **Enterprise Features** - SSO, audit logs, compliance
- **Plugin System** - Extensible architecture
- **Marketplace** - Pre-built application templates

## 📞 Support

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community support
- **Project TODO**: Check [PROJECT_TODO.md](PROJECT_TODO.md) for current status
- **Make Commands**: Use `make help` to see available commands

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Raspberry Pi Foundation for the amazing hardware
- Docker team for containerization
- Caddy team for the excellent reverse proxy
- All contributors and community members