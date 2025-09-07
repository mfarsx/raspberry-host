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

6. **Deploy applications** using the provided deployment tools

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

## 🎯 Hosting Capabilities

This Raspberry Pi 5 hosting platform provides:

- **🌐 Web Application Hosting**: Deploy React, Vue, Angular, or static sites
- **⚡ API Hosting**: Host Node.js, Python, or other API services
- **🗄️ Database Hosting**: MongoDB and Redis for your applications
- **🔒 SSL/TLS**: Automatic HTTPS certificates for all hosted domains
- **⚖️ Load Balancing**: Distribute traffic across multiple application instances
- **📊 Monitoring**: Real-time health checks and performance monitoring
- **💾 Backup**: Automated backup and restore for hosted applications
- **🔧 DevOps Tools**: CI/CD pipelines, automated deployments, and rollbacks

## 📊 Project Status

This project is currently in **active development**. We're following a structured 11-phase development plan:

### 🏗️ Current Phase: Core Infrastructure (Phase 1-3)
- [x] Project setup and documentation
- [ ] Docker Compose configuration
- [ ] Caddy reverse proxy setup
- [ ] MongoDB and Redis configuration
- [ ] Basic API and frontend

### 📅 Development Timeline
- **Phase 1-3**: Core Infrastructure (Weeks 1-3)
- **Phase 4-6**: Security & Monitoring (Weeks 4-6)
- **Phase 7-9**: Production Ready (Weeks 7-9)

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

### Short Term (Next 3 months)
- Complete core infrastructure setup
- Implement security features
- Add monitoring and logging
- Create comprehensive documentation

### Medium Term (3-6 months)
- Add advanced deployment features
- Implement backup and recovery
- Add performance optimization
- Create management dashboard

### Long Term (6+ months)
- Multi-tenant support
- Advanced scaling features
- Plugin system
- Enterprise features

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