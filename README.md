# Raspberry Pi 5 Host Server

A production-ready hosting platform for Raspberry Pi 5 running on ARM64 architecture. This project provides the infrastructure to host and deploy web applications on your Raspberry Pi 5.

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

## Quick Start

1. Clone this repository on your Raspberry Pi 5
2. Copy `.env.example` to `.env` and configure your domain
3. Run `make setup` to initialize the hosting environment
4. Run `make up` to start all hosting services
5. Access your hosting platform at `https://yourdomain.com`
6. Deploy your applications using the provided deployment tools

## Requirements

- Raspberry Pi 5 with Raspberry Pi OS Bookworm
- Domain name pointing to your Pi's IP
- Ports 80 and 443 forwarded on your router

## Hosting Capabilities

This Raspberry Pi 5 host server provides:

- **Web Application Hosting**: Deploy React, Vue, Angular, or static sites
- **API Hosting**: Host Node.js, Python, or other API services
- **Database Hosting**: MongoDB and Redis for your applications
- **SSL/TLS**: Automatic HTTPS certificates for all hosted domains
- **Load Balancing**: Distribute traffic across multiple application instances
- **Monitoring**: Real-time health checks and performance monitoring
- **Backup**: Automated backup and restore for hosted applications

## Documentation

See the full documentation in the `docs/` directory for detailed setup instructions, security guidelines, deployment procedures, and operational procedures.