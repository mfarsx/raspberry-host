# 🍓 Raspberry Pi Multi-Project Setup Guide

This guide shows you how to deploy **Website**, **VPN**, and **Adblocker** projects on your Raspberry Pi hosting platform.

## 🎯 What You'll Get

After setup, you'll have:
- **🌐 Website**: Your own website with automatic HTTPS
- **🔒 VPN**: WireGuard VPN for secure remote access
- **🛡️ Adblocker**: Pi-hole for network-wide ad blocking
- **📊 Monitoring**: Real-time monitoring of all services
- **🔧 Management**: Web interface to manage all projects

## 🚀 Quick Start

### 1. On Your Raspberry Pi

```bash
# Clone the project
git clone https://github.com/mfarsx/raspberry-host.git
cd raspberry-host

# Run the setup script
chmod +x setup-pi-projects.sh
./setup-pi-projects.sh
```

### 2. Configure Your Domain

Edit `.env` file:
```bash
DOMAIN=yourdomain.com
TLS_EMAIL=your-email@example.com
MONGO_ROOT_PASSWORD=your-secure-password
REDIS_PASSWORD=your-secure-password
JWT_SECRET=your-super-secret-jwt-key
```

### 3. Start the Platform

```bash
make up
```

## 📦 Project Deployment

### 🌐 Website Project

**Option 1: Use Template**
```bash
# The script creates a template for you
# Just deploy through the web interface
```

**Option 2: Your Own Website**
1. Create a Git repository with your website
2. Add a `Dockerfile`:
```dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80
```
3. Deploy through web interface

**Deployment Settings:**
- Repository: `https://github.com/yourusername/your-website.git`
- Domain: `website.yourdomain.com`
- Port: `80`

### 🔒 VPN Project (WireGuard)

**Features:**
- Secure remote access
- Multiple client support
- Easy client configuration
- Web interface for management

**Deployment Settings:**
- Repository: `https://github.com/yourusername/pi-vpn.git`
- Domain: `vpn.yourdomain.com` (optional)
- Port: `51820` (UDP)
- Environment Variables:
  - `SERVERURL=yourdomain.com`
  - `PEERS=5` (number of clients)
  - `WEBPASSWORD=your-admin-password`

**Client Setup:**
1. Access VPN web interface
2. Download client configurations
3. Import to WireGuard app
4. Connect and enjoy secure access

### 🛡️ Adblocker Project (Pi-hole)

**Features:**
- Network-wide ad blocking
- DNS over HTTPS
- Custom blocklists
- Detailed statistics
- Web interface for management

**Deployment Settings:**
- Repository: `https://github.com/yourusername/pi-adblocker.git`
- Domain: `adblock.yourdomain.com`
- Port: `80`
- Environment Variables:
  - `WEBPASSWORD=your-admin-password`
  - `DNS1=1.1.1.1`
  - `DNS2=1.0.0.1`

**Router Configuration:**
1. Set Pi-hole IP as DNS server
2. All devices will automatically use ad blocking
3. Access web interface for statistics

## 🌐 Domain Configuration

### DNS Setup
Create these DNS records:
```
yourdomain.com          A    YOUR_PI_IP
website.yourdomain.com  A    YOUR_PI_IP
vpn.yourdomain.com      A    YOUR_PI_IP
adblock.yourdomain.com  A    YOUR_PI_IP
```

### Router Port Forwarding
Forward these ports to your Pi:
```
80    → Pi (HTTP)
443   → Pi (HTTPS)
51820 → Pi (WireGuard VPN)
53    → Pi (DNS - optional)
```

## 📊 Access Your Services

After deployment, access your services at:

- **🏠 Main Platform**: `https://yourdomain.com`
- **🌐 Website**: `https://website.yourdomain.com`
- **🔒 VPN**: `https://vpn.yourdomain.com` (if configured)
- **🛡️ Adblocker**: `https://adblock.yourdomain.com`

## 🔧 Management

### Web Interface
- **Dashboard**: Monitor all projects
- **Deploy**: Add new projects
- **Projects**: Manage existing projects
- **System**: View system information

### Command Line
```bash
# Check status
make status

# View logs
make logs

# Restart services
make restart

# Backup data
make backup
```

## 🚨 Troubleshooting

### Common Issues

**1. SSL Certificate Issues**
```bash
# Check Caddy logs
docker logs pi-caddy

# Restart Caddy
docker restart pi-caddy
```

**2. VPN Connection Issues**
```bash
# Check WireGuard logs
docker logs wireguard

# Verify port forwarding
sudo ufw status
```

**3. Adblocker Not Working**
```bash
# Check Pi-hole logs
docker logs pihole

# Verify DNS settings
nslookup google.com YOUR_PI_IP
```

### Useful Commands

```bash
# Check all containers
docker ps

# Check resource usage
docker stats

# View specific logs
docker logs CONTAINER_NAME

# Restart specific service
docker restart CONTAINER_NAME
```

## 📈 Monitoring

### Health Checks
All services have automatic health checks:
- Container status
- Service availability
- Resource usage
- Error logs

### Alerts
Set up monitoring for:
- Service downtime
- High resource usage
- SSL certificate expiration
- VPN connection issues

## 🔒 Security

### Automatic Security Features
- **HTTPS**: Automatic SSL certificates
- **Security Headers**: HSTS, CSP, XSS protection
- **Rate Limiting**: Protection against abuse
- **Container Isolation**: Each project runs separately
- **Non-root Containers**: Enhanced security

### Additional Security
- **Firewall**: UFW configured automatically
- **VPN**: Secure remote access
- **Ad Blocking**: Protection against malicious ads
- **Regular Updates**: Watchtower for automatic updates

## 💾 Backup & Recovery

### Automatic Backups
```bash
# Create backup
make backup

# List backups
ls -la backups/

# Restore backup
make restore-backup BACKUP_DIR=backups/YYYYMMDD_HHMMSS
```

### What's Backed Up
- MongoDB databases
- Redis data
- Project configurations
- SSL certificates
- Container volumes

## 🎯 Next Steps

1. **Deploy Your Projects**: Use the web interface to deploy each project
2. **Configure DNS**: Point your domains to your Pi
3. **Set Up Router**: Configure port forwarding
4. **Test Everything**: Verify all services work
5. **Monitor**: Set up monitoring and alerts
6. **Backup**: Schedule regular backups

## 🆘 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check the main README
- **Community**: Join discussions for help

---

**🎉 Congratulations!** You now have a complete self-hosted platform running multiple services on your Raspberry Pi!