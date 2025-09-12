# Node.js API - Multi-stage Dockerfile
FROM node:18-alpine AS base

# Install system dependencies including Git, Docker CLI, and Docker Compose
RUN apk add --no-cache \
    curl \
    dumb-init \
    git \
    docker-cli \
    && rm -rf /var/cache/apk/* \
    && curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose \
    && chmod +x /usr/local/bin/docker-compose

# Create app directory and user
WORKDIR /app
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Development stage
FROM base AS development
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3 && \
    npm config set audit false && \
    npm config set fund false && \
    npm install --no-audit --no-fund --ignore-scripts
COPY . .
RUN chown -R nodejs:nodejs /app
# USER nodejs  # Commented out to allow docker-compose user override
EXPOSE 3001
CMD ["npm", "run", "dev"]

# Production stage
FROM base AS production
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3 && \
    npm config set audit false && \
    npm config set fund false && \
    npm ci --only=production --no-audit --no-fund --ignore-scripts && \
    npm cache clean --force
COPY . .
RUN mkdir -p /app/logs /app/uploads && chown -R nodejs:nodejs /app
USER nodejs
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3001/api/health || exit 1
EXPOSE 3001
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "src/index.js"]