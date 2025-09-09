# 🍓 macOS Development Guide

This guide shows you how to develop and test the Raspberry Pi hosting platform on macOS before deploying to your Pi.

## 🚀 Quick Start

### 1. Start Development Environment

```bash
# Start databases
docker run -d --name mongodb-dev -p 27017:27017 -e MONGO_INITDB_DATABASE=pi_app_dev mongo:7.0-jammy mongod --bind_ip_all
docker run -d --name redis-dev -p 6379:6379 redis:7.2-alpine redis-server --appendonly yes

# Start API (in terminal 1)
cd api && npm run dev

# Start Web (in terminal 2)
cd web && npm start
```

### 2. Access Services

- **🌐 Web Interface**: `http://localhost:3000`
- **🔧 API**: `http://localhost:3001`
- **🗄️ MongoDB**: `localhost:27017`
- **⚡ Redis**: `localhost:6379`

## 📦 Testing Project Templates

### 🌐 Website Project

```bash
# Build and test website
cd test-projects/website
docker build -t test-website .
docker run -d -p 8080:80 --name test-website test-website

# Test website
curl http://localhost:8080
# Or open http://localhost:8080 in browser
```

### 🔒 VPN Project (WireGuard)

```bash
# Create VPN test project
mkdir test-projects/vpn-test
cd test-projects/vpn-test

# Copy VPN template
cp ../examples/vpn/* .

# Build and test
docker-compose up -d
```

### 🛡️ Adblocker Project (Pi-hole)

```bash
# Create adblocker test project
mkdir test-projects/adblocker-test
cd test-projects/adblocker-test

# Copy adblocker template
cp ../examples/adblocker/* .

# Build and test
docker-compose up -d
```

## 🔧 Development Workflow

### Hot Reload Development

1. **API Development**:
   ```bash
   cd api
   npm run dev  # Auto-restarts on file changes
   ```

2. **Web Development**:
   ```bash
   cd web
   npm start    # Hot reload in browser
   ```

3. **Database Access**:
   ```bash
   # MongoDB
   docker exec -it mongodb-dev mongosh
   
   # Redis
   docker exec -it redis-dev redis-cli
   ```

### Testing API Endpoints

```bash
# Health check
curl http://localhost:3001/api/health

# Projects endpoint
curl http://localhost:3001/api/projects

# WebSocket test
# Open browser console and connect to ws://localhost:3001/ws
```

## 📊 Project Management Testing

### Deploy Test Projects

1. **Via Web Interface**:
   - Go to `http://localhost:3000/deploy`
   - Enter project details
   - Test deployment flow

2. **Via API**:
   ```bash
   # Deploy website project
   curl -X POST http://localhost:3001/api/projects \
     -H "Content-Type: application/json" \
     -d '{
       "name": "test-website",
       "repository": "https://github.com/yourusername/test-website.git",
       "domain": "test.localhost",
       "port": 80
     }'
   ```

### Monitor Projects

```bash
# Check project status
curl http://localhost:3001/api/projects

# View project logs
curl http://localhost:3001/api/projects/test-website/logs

# Restart project
curl -X POST http://localhost:3001/api/projects/test-website/restart
```

## 🧪 Testing Checklist

### ✅ Platform Testing

- [ ] API starts successfully
- [ ] Web interface loads
- [ ] Database connections work
- [ ] WebSocket connections work
- [ ] Health checks pass
- [ ] Project deployment works
- [ ] Project management works

### ✅ Project Template Testing

- [ ] Website template builds and runs
- [ ] VPN template builds and runs
- [ ] Adblocker template builds and runs
- [ ] All containers start successfully
- [ ] Services are accessible
- [ ] Health checks work

### ✅ Integration Testing

- [ ] Deploy website through web interface
- [ ] Deploy VPN through web interface
- [ ] Deploy adblocker through web interface
- [ ] Monitor all projects
- [ ] Restart/stop projects
- [ ] View project logs

## 🔄 Preparing for Pi Deployment

### 1. Build ARM64 Images

```bash
# Build for ARM64 (Raspberry Pi)
docker buildx create --use
docker buildx build --platform linux/arm64 -t raspberry-host-api:arm64 ./api
docker buildx build --platform linux/arm64 -t raspberry-host-web:arm64 ./web
```

### 2. Test Project Templates

```bash
# Test website template
cd test-projects/website
docker buildx build --platform linux/arm64 -t test-website:arm64 .

# Test VPN template
cd ../vpn-test
docker-compose build

# Test adblocker template
cd ../adblocker-test
docker-compose build
```

### 3. Create Deployment Package

```bash
# Create deployment script
./create-pi-deployment.sh
```

## 🚨 Troubleshooting

### Common Issues

**1. Port Conflicts**
```bash
# Kill processes using ports
lsof -ti:3000 | xargs kill -9
lsof -ti:3001 | xargs kill -9
lsof -ti:27017 | xargs kill -9
lsof -ti:6379 | xargs kill -9
```

**2. Docker Issues**
```bash
# Clean up Docker
docker system prune -f
docker volume prune -f

# Restart Docker Desktop
```

**3. Database Connection Issues**
```bash
# Check database status
docker ps | grep -E "(mongo|redis)"

# Restart databases
docker restart mongodb-dev redis-dev
```

**4. Build Issues**
```bash
# Clear npm cache
npm cache clean --force

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📈 Performance Testing

### Load Testing

```bash
# Install artillery for load testing
npm install -g artillery

# Test API endpoints
artillery quick --count 10 --num 5 http://localhost:3001/api/health
```

### Resource Monitoring

```bash
# Monitor Docker resources
docker stats

# Monitor system resources
top -o cpu
```

## 🎯 Next Steps

1. **Complete Testing**: Test all project templates
2. **Performance Testing**: Load test the platform
3. **Security Testing**: Test security features
4. **Documentation**: Update deployment guides
5. **Pi Deployment**: Transfer to Raspberry Pi

## 📚 Useful Commands

```bash
# Development
npm run dev          # Start API with hot reload
npm start           # Start React app
npm test            # Run tests
npm run build       # Build for production

# Docker
docker ps           # List running containers
docker logs <name>  # View container logs
docker exec -it <name> sh  # Access container shell

# Database
mongosh            # MongoDB shell
redis-cli          # Redis CLI
```

---

**🎉 Happy Developing!** This setup gives you a complete development environment for testing your Raspberry Pi hosting platform before deployment.