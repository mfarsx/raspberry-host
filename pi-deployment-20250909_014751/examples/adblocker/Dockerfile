# Pi-hole Ad Blocker Service Dockerfile
FROM alpine:latest

# Install docker-compose
RUN apk add --no-cache docker-compose

# Copy configuration files
COPY . /app
WORKDIR /app

# Create necessary directories
RUN mkdir -p etc-pihole etc-dnsmasq.d

# Expose ports
EXPOSE 53 80 443

# Start Pi-hole service
CMD ["docker-compose", "up", "-d"]