# React Frontend - Multi-stage Dockerfile
FROM node:20-alpine AS base

# Install system dependencies
RUN apk add --no-cache curl dumb-init && rm -rf /var/cache/apk/*

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
    npm install --no-audit --no-fund
COPY . .
RUN chown -R nodejs:nodejs /app
USER nodejs
EXPOSE 3000
CMD ["npm", "start"]

# Build stage
FROM base AS build
RUN npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 3 && \
    npm install --no-audit --no-fund && \
    npm cache clean --force
COPY . .
RUN chown -R nodejs:nodejs /app
USER nodejs
RUN npm run build

# Production stage with nginx
FROM nginx:alpine AS production
RUN apk add --no-cache curl gettext && rm -rf /var/cache/apk/*
COPY nginx.conf.template /etc/nginx/nginx.conf.template
COPY --from=build /app/build /usr/share/nginx/html
RUN chown -R nginx:nginx /usr/share/nginx/html /var/cache/nginx /var/log/nginx /etc/nginx/conf.d && \
    touch /var/run/nginx.pid && chown -R nginx:nginx /var/run/nginx.pid
USER nginx
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${WEB_PORT:-80} || exit 1
EXPOSE ${WEB_PORT:-80}
CMD envsubst '${WEB_PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'