# Raspberry Pi 5 Server

A production-ready web stack for Raspberry Pi 5 running on ARM64 architecture.

## Architecture

```
Internet → Caddy (HTTPS) → Express API ↔ MongoDB, Redis
                        → React Static Files
```

## Features

- **Frontend**: React application with modern UI
- **Backend**: Node.js + Express API with WebSocket support
- **Database**: MongoDB with authentication
- **Cache**: Redis for session management and caching
- **Proxy**: Caddy with automatic HTTPS (Let's Encrypt)
- **Containerization**: Docker + Docker Compose for ARM64
- **Security**: Non-root containers, HSTS, rate limiting
- **Monitoring**: Health checks, structured logging

## Quick Start

1. Clone this repository on your Raspberry Pi 5
2. Copy `.env.example` to `.env` and configure your domain
3. Run `make setup` to initialize the environment
4. Run `make up` to start all services
5. Access your site at `https://yourdomain.com`

## Requirements

- Raspberry Pi 5 with Raspberry Pi OS Bookworm
- Domain name pointing to your Pi's IP
- Ports 80 and 443 forwarded on your router

## Documentation

See the full documentation in the `docs/` directory for detailed setup instructions, security guidelines, and operational procedures.