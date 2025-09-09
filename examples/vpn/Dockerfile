# WireGuard VPN Service Dockerfile
FROM alpine:latest

# Install docker-compose
RUN apk add --no-cache docker-compose

# Copy configuration files
COPY . /app
WORKDIR /app

# Create config directory
RUN mkdir -p config

# Expose WireGuard port
EXPOSE 51820/udp

# Start WireGuard service
CMD ["docker-compose", "up", "-d"]