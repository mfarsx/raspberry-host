# Raspberry Pi 5 Hosting Platform

A production-ready hosting platform for Raspberry Pi 5 running on ARM64 architecture. This project provides a complete infrastructure to host and deploy web applications on your Raspberry Pi 5 with Docker, automatic HTTPS, and enterprise-grade security.

## Architecture

```
Internet → Caddy (HTTPS) → Express API ↔ MongoDB, Redis
                        → React Static Files
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
   cp .env.example .env
   # Edit .env with your domain and settings
   ```

3. **Initialize the hosting environment**:
   ```bash
   make setup
   ```

4. **Start all hosting services**:
   ```bash
   make up
   ```

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
- [x] **Docker Compose configuration** - ARM64 optimized
- [x] **Caddy reverse proxy setup** - Automatic HTTPS
- [x] **MongoDB and Redis configuration** - With authentication
- [x] **Complete API and frontend** - Hosting management dashboard
- [x] **Project deployment system** - Deploy from Git repositories
- [x] **Multi-domain hosting** - Host multiple websites
- [x] **Environment management** - Configure projects
- [x] **Monitoring and logging** - Real-time project status

### 🚀 Ready for Production
- **Phase 1-4**: Core Infrastructure ✅ **COMPLETED**
- **Phase 5-6**: Advanced Monitoring & Security (Optional enhancements)
- **Phase 7-9**: Enterprise Features (Optional additions)

### 🎯 Progress Tracking
See our [Project TODO](PROJECT_TODO.md) for detailed task breakdown and [Project Board](.github/project-board.md) for current status.

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### For Developers
1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow our development workflow**:
   - Check the [Project TODO](PROJECT_TODO.md) for available tasks
   - Create a GitHub issue for your task
   - Use our issue templates for consistency
4. **Commit your changes**: `git commit -m 'Add amazing feature'`
5. **Push to your branch**: `git push origin feature/amazing-feature`
6. **Open a Pull Request**

### Development Workflow
- **Issues**: Use our GitHub issue templates (Bug Report, Feature Request, Task)
- **Labels**: We use labels for priority, phase, and status tracking
- **Project Board**: Automated project management with GitHub Projects
- **Code Review**: All changes require review before merging

### For Users
- **Report bugs** using our Bug Report template
- **Request features** using our Feature Request template
- **Ask questions** in GitHub Discussions
- **Share your setup** and experiences

## 📚 Documentation

### Quick Links
- [📋 Project TODO](PROJECT_TODO.md) - Complete task breakdown
- [📊 Project Board](.github/project-board.md) - Development workflow
- [🐛 Issue Templates](.github/ISSUE_TEMPLATE/) - Bug reports and feature requests

### Detailed Documentation
See the full documentation in the `docs/` directory for:
- **Setup Instructions**: Detailed Raspberry Pi configuration
- **Security Guidelines**: Best practices and hardening
- **Deployment Procedures**: Production deployment steps
- **Operational Procedures**: Monitoring, backups, and maintenance
- **API Documentation**: Complete API reference
- **Troubleshooting Guide**: Common issues and solutions

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
cp .env.example .env
# Edit .env with your local settings

# Start development environment
make dev

# Run tests
make test

# Build for production
make build
```

## 📈 Roadmap

### ✅ Completed (Core Platform)
- ✅ Complete hosting infrastructure
- ✅ Multi-domain hosting support
- ✅ Project deployment from Git
- ✅ Web management dashboard
- ✅ Automatic SSL certificates
- ✅ Real-time monitoring and logs
- ✅ Docker container management

### 🔄 Optional Enhancements
- **Advanced Security** - User authentication, RBAC
- **Enhanced Monitoring** - Metrics, alerting, dashboards
- **Backup Automation** - Scheduled backups, disaster recovery
- **Performance Optimization** - Caching, CDN integration
- **Plugin System** - Extensible architecture
- **API Management** - Rate limiting, API keys

### 🚀 Future Features
- **Multi-tenant Support** - Multiple users/organizations
- **Advanced Scaling** - Load balancing, auto-scaling
- **Enterprise Features** - SSO, audit logs, compliance
- **Marketplace** - Pre-built application templates

## 📞 Support

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and community support
- **Documentation**: Check the docs/ directory first
- **Project Board**: Track development progress

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Raspberry Pi Foundation for the amazing hardware
- Docker team for containerization
- Caddy team for the excellent reverse proxy
- All contributors and community members