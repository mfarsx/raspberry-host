# 🍓 Raspberry Pi Project Deployment Guide

This guide shows you how to deploy multiple projects on your Raspberry Pi hosting platform.

## 🚀 Quick Setup on Raspberry Pi

### 1. Initial Platform Setup

```bash
# On your Raspberry Pi
git clone https://github.com/mfarsx/raspberry-host.git
cd raspberry-host

# Configure environment
cp .env.example .env
# Edit .env with your domain and passwords

# Start the platform
make up
```

### 2. Access the Platform

- **Web Interface**: `https://yourdomain.com`
- **API**: `https://yourdomain.com/api`
- **WebSocket**: `wss://yourdomain.com/ws`

## 📦 Project Deployment Examples

### 🌐 Website Project

#### Option 1: Static Website
```bash
# Create a simple static site
mkdir my-website
cd my-website

# Create index.html
cat > index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to My Website!</h1>
        <p>This is hosted on my Raspberry Pi.</p>
    </div>
</body>
</html>
EOF

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
EOF

# Initialize git repo
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/my-website.git
git push -u origin main
```

#### Option 2: React/Vue/Angular App
```bash
# For React app
npx create-react-app my-react-app
cd my-react-app

# Create Dockerfile
cat > Dockerfile << 'EOF'
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
EOF

git init
git add .
git commit -m "React app ready for deployment"
git remote add origin https://github.com/yourusername/my-react-app.git
git push -u origin main
```

### 🔒 VPN Service (WireGuard)

#### Option 1: WireGuard Container
```bash
# Create WireGuard project
mkdir pi-vpn
cd pi-vpn

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  wireguard:
    image: linuxserver/wireguard:latest
    container_name: wireguard
    cap_add:
      - NET_ADMIN
      - SYS_MODULE
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=UTC
      - SERVERURL=yourdomain.com
      - SERVERPORT=51820
      - PEERS=5
      - PEERDNS=auto
      - INTERNAL_SUBNET=10.13.13.0
    volumes:
      - ./config:/config
      - /lib/modules:/lib/modules:ro
    ports:
      - "51820:51820/udp"
    sysctls:
      - net.ipv4.conf.all.src_valid_mark=1
    restart: unless-stopped
EOF

# Create Dockerfile for the hosting platform
cat > Dockerfile << 'EOF'
FROM alpine:latest
RUN apk add --no-cache docker-compose
COPY . /app
WORKDIR /app
CMD ["docker-compose", "up", "-d"]
EOF

git init
git add .
git commit -m "WireGuard VPN service"
git remote add origin https://github.com/yourusername/pi-vpn.git
git push -u origin main
```

### 🛡️ Adblocker (Pi-hole)

#### Pi-hole Container Setup
```bash
# Create Pi-hole project
mkdir pi-adblocker
cd pi-adblocker

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'
services:
  pihole:
    container_name: pihole
    image: pihole/pihole:latest
    ports:
      - "53:53/tcp"
      - "53:53/udp"
      - "80:80/tcp"
      - "443:443/tcp"
    environment:
      TZ: 'UTC'
      WEBPASSWORD: 'your-admin-password'
      DNS1: 1.1.1.1
      DNS2: 1.0.0.1
    volumes:
      - './etc-pihole:/etc/pihole'
      - './etc-dnsmasq.d:/etc/dnsmasq.d'
    cap_add:
      - NET_ADMIN
    restart: unless-stopped
EOF

# Create Dockerfile for the hosting platform
cat > Dockerfile << 'EOF'
FROM alpine:latest
RUN apk add --no-cache docker-compose
COPY . /app
WORKDIR /app
CMD ["docker-compose", "up", "-d"]
EOF

git init
git add .
git commit -m "Pi-hole adblocker service"
git remote add origin https://github.com/yourusername/pi-adblocker.git
git push -u origin main
```

## 🌐 Domain Configuration

### Caddyfile Updates
You'll need to update your Caddyfile to route different subdomains:

```caddyfile
# Main platform
{$DOMAIN:localhost} {
    # ... existing configuration ...
}

# Website subdomain
website.{$DOMAIN:localhost} {
    tls {$TLS_EMAIL:admin@localhost}
    reverse_proxy /* {
        to website-container:80
    }
}

# VPN subdomain (if needed)
vpn.{$DOMAIN:localhost} {
    tls {$TLS_EMAIL:admin@localhost}
    reverse_proxy /* {
        to wireguard-container:80
    }
}

# Adblocker subdomain
adblock.{$DOMAIN:localhost} {
    tls {$TLS_EMAIL:admin@localhost}
    reverse_proxy /* {
        to pihole-container:80
    }
}
```

## 📋 Deployment Steps

### 1. Deploy Website
1. Go to `https://yourdomain.com/deploy`
2. Enter your Git repository URL
3. Set domain: `website.yourdomain.com`
4. Set port: `80`
5. Click "Deploy Project"

### 2. Deploy VPN
1. Go to `https://yourdomain.com/deploy`
2. Enter your WireGuard Git repository URL
3. Set domain: `vpn.yourdomain.com` (optional)
4. Set port: `51820` (UDP)
5. Add environment variables:
   - `SERVERURL=yourdomain.com`
   - `PEERS=5`
6. Click "Deploy Project"

### 3. Deploy Adblocker
1. Go to `https://yourdomain.com/deploy`
2. Enter your Pi-hole Git repository URL
3. Set domain: `adblock.yourdomain.com`
4. Set port: `80`
5. Add environment variables:
   - `WEBPASSWORD=your-admin-password`
6. Click "Deploy Project"

## 🔧 Network Configuration

### Router Setup
1. **Port Forwarding**:
   - Port 80 → Raspberry Pi (HTTP)
   - Port 443 → Raspberry Pi (HTTPS)
   - Port 51820 → Raspberry Pi (WireGuard VPN)

2. **DNS Configuration**:
   - Point your domain to your Pi's IP
   - Create subdomains: `website`, `vpn`, `adblock`

### Pi Network Setup
```bash
# Enable IP forwarding for VPN
echo 'net.ipv4.ip_forward = 1' >> /etc/sysctl.conf
sysctl -p

# Configure firewall
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 51820/udp
sudo ufw enable
```

## 📊 Monitoring

After deployment, you can monitor all projects at:
- **Main Dashboard**: `https://yourdomain.com`
- **Project Management**: `https://yourdomain.com/projects`
- **System Info**: `https://yourdomain.com/system`

## 🚨 Troubleshooting

### Common Issues
1. **Port Conflicts**: Make sure ports don't conflict
2. **DNS Issues**: Check domain DNS settings
3. **Container Permissions**: VPN needs NET_ADMIN capability
4. **SSL Certificates**: Let's Encrypt needs port 80/443 access

### Useful Commands
```bash
# Check platform status
make status

# View logs
make logs

# Restart services
make restart

# Check resource usage
make resources
```

## 🎯 Next Steps

1. **Set up your Raspberry Pi** with the platform
2. **Configure your domain** and DNS
3. **Deploy each project** through the web interface
4. **Monitor and manage** through the dashboard
5. **Set up backups** for your data

This platform gives you a complete self-hosted solution for running multiple services on your Raspberry Pi!