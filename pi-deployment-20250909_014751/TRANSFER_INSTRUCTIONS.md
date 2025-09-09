# 🍓 Raspberry Pi Transfer Instructions

## 📦 Transfer Methods

### Method 1: Git Clone (Recommended)
```bash
# On your Raspberry Pi
git clone https://github.com/mfarsx/raspberry-host.git
cd raspberry-host
```

### Method 2: SCP Transfer
```bash
# From your Mac
scp -r pi-deployment-YYYYMMDD_HHMMSS pi@your-pi-ip:~/

# On your Pi
cd pi-deployment-YYYYMMDD_HHMMSS
```

### Method 3: USB Transfer
1. Copy the deployment directory to USB drive
2. Mount USB on Pi
3. Copy files to Pi

## 🚀 Setup on Raspberry Pi

### 1. Run Setup Script
```bash
chmod +x setup-pi.sh
./setup-pi.sh
```

### 2. Configure Environment
Edit `.env` file with your settings:
- `DOMAIN=yourdomain.com`
- `TLS_EMAIL=your-email@example.com`
- `MONGO_ROOT_PASSWORD=your-secure-password`
- `REDIS_PASSWORD=your-secure-password`
- `JWT_SECRET=your-super-secret-key`

### 3. Start Platform
```bash
make up
```

### 4. Deploy Projects
```bash
chmod +x deploy-projects.sh
./deploy-projects.sh
```

## 🌐 Domain Setup

### DNS Configuration
Create these DNS records:
```
yourdomain.com          A    YOUR_PI_IP
website.yourdomain.com  A    YOUR_PI_IP
vpn.yourdomain.com      A    YOUR_PI_IP
adblock.yourdomain.com  A    YOUR_PI_IP
```

### Router Configuration
Forward these ports to your Pi:
```
80    → Pi (HTTP)
443   → Pi (HTTPS)
51820 → Pi (WireGuard VPN)
53    → Pi (DNS - optional)
```

## 📊 Access Your Services

After setup, access your services at:
- **🏠 Main Platform**: `https://yourdomain.com`
- **🌐 Website**: `https://website.yourdomain.com`
- **🔒 VPN**: `https://vpn.yourdomain.com`
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
1. **SSL Certificate Issues**: Check Caddy logs
2. **VPN Connection Issues**: Verify port forwarding
3. **Adblocker Not Working**: Check DNS settings
4. **Service Won't Start**: Check Docker logs

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

## 📞 Support

- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check README.md and guides
- **Community**: Join discussions for help

---

**🎉 Congratulations!** You now have a complete self-hosted platform running multiple services on your Raspberry Pi!
