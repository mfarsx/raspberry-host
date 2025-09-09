# Raspberry Pi Hosting Platform API Documentation

## Overview

The Raspberry Pi Hosting Platform API provides a comprehensive REST API for managing and deploying projects on a Raspberry Pi 5 hosting environment. The API supports project deployment, monitoring, health checks, and system management.

## Base URL

- Development: `http://localhost:3001`
- Production: `https://your-domain.com`

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Rate Limiting

- General API: 100 requests per 15 minutes per IP
- Authentication endpoints: 5 requests per 15 minutes per IP
- API endpoints: 60 requests per minute per IP

## Error Handling

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message",
  "category": "ERROR_CATEGORY",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "requestId": "unique-request-id"
}
```

### Error Categories

- `VALIDATION_ERROR`: Input validation failed
- `AUTH_ERROR`: Authentication/authorization error
- `NOT_FOUND`: Resource not found
- `DUPLICATE_ERROR`: Duplicate resource
- `NETWORK_ERROR`: Network connectivity issue
- `TIMEOUT_ERROR`: Request timeout
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `INTERNAL_ERROR`: Internal server error

## Endpoints

### Health Check

#### GET /api/health

Check the health status of the API and its dependencies.

**Response:**
```json
{
  "ok": true,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "responseTime": "15ms",
  "services": {
    "database": {
      "connected": true,
      "status": "connected",
      "collections": 5,
      "documents": 100
    },
    "redis": {
      "connected": true,
      "status": "connected",
      "connectedClients": 3,
      "memoryUsed": "2.5MB"
    },
    "api": {
      "connected": true,
      "uptime": "3600s",
      "memory": "45MB",
      "version": "v18.17.0"
    }
  },
  "system": {
    "uptime": 3600,
    "memory": {...},
    "cpu": {...},
    "platform": "linux",
    "nodeVersion": "v18.17.0",
    "pid": 1234
  }
}
```

#### GET /api/health/detailed

Get detailed health information including system metrics.

### System Information

#### GET /api/stats

Get system statistics and performance metrics.

**Response:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "system": {
    "uptime": 3600,
    "memory": {
      "used": 45,
      "total": 100,
      "external": 5,
      "rss": 50
    },
    "cpu": {...},
    "platform": "linux",
    "arch": "arm64",
    "nodeVersion": "v18.17.0",
    "pid": 1234
  },
  "database": {
    "connected": true,
    "collections": 5,
    "documents": 100
  },
  "redis": {
    "connected": true,
    "connectedClients": 3,
    "memoryUsed": "2.5MB"
  }
}
```

#### GET /api/system

Get comprehensive system information.

**Response:**
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "platform": "linux",
  "arch": "arm64",
  "nodeVersion": "v18.17.0",
  "v8Version": "10.2.154.26",
  "uptime": 3600,
  "pid": 1234,
  "cwd": "/app",
  "env": {
    "NODE_ENV": "production",
    "PORT": "3001"
  },
  "timezone": "UTC",
  "hostname": "raspberry-pi",
  "loadAverage": [0.5, 0.3, 0.2],
  "memory": {
    "total": "8GB",
    "free": "6GB",
    "used": "2GB",
    "usage": "25%"
  },
  "cpu": {
    "model": "ARM Cortex-A76",
    "cores": 4,
    "speed": "1800MHz"
  },
  "network": {
    "interfaces": {...}
  }
}
```

### Projects

#### GET /api/projects

Get all hosted projects.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "my-app-1234567890",
      "name": "my-app",
      "domain": "myapp.example.com",
      "repository": "https://github.com/user/my-app.git",
      "branch": "main",
      "status": "running",
      "port": 3000,
      "environment": {
        "NODE_ENV": "production"
      },
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "lastDeployed": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### GET /api/projects/:id

Get a specific project by ID.

**Parameters:**
- `id` (string): Project ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "my-app-1234567890",
    "name": "my-app",
    "domain": "myapp.example.com",
    "repository": "https://github.com/user/my-app.git",
    "branch": "main",
    "status": "running",
    "port": 3000,
    "environment": {
      "NODE_ENV": "production"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastDeployed": "2024-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/projects/deploy

Deploy a new project.

**Request Body:**
```json
{
  "name": "my-app",
  "domain": "myapp.example.com",
  "repository": "https://github.com/user/my-app.git",
  "branch": "main",
  "buildCommand": "npm run build",
  "startCommand": "npm start",
  "port": 3000,
  "environment": {
    "NODE_ENV": "production",
    "API_KEY": "secret-key"
  }
}
```

**Validation Rules:**
- `name`: Required, 1-50 characters, alphanumeric with hyphens/underscores
- `domain`: Required, valid domain name
- `repository`: Required, valid Git URL
- `branch`: Optional, 1-100 characters, defaults to "main"
- `buildCommand`: Optional, max 500 characters
- `startCommand`: Optional, max 500 characters
- `port`: Optional, 1-65535, defaults to 3000
- `environment`: Optional, key-value pairs

**Response:**
```json
{
  "success": true,
  "message": "Project deployed successfully",
  "data": {
    "id": "my-app-1234567890",
    "name": "my-app",
    "domain": "myapp.example.com",
    "repository": "https://github.com/user/my-app.git",
    "branch": "main",
    "status": "running",
    "port": 3000,
    "environment": {
      "NODE_ENV": "production",
      "API_KEY": "secret-key"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastDeployed": "2024-01-01T00:00:00.000Z"
  }
}
```

#### PUT /api/projects/:id

Update an existing project.

**Parameters:**
- `id` (string): Project ID

**Request Body:** (Same as deploy, but all fields optional)

**Response:**
```json
{
  "success": true,
  "message": "Project updated successfully",
  "data": {
    "id": "my-app-1234567890",
    "name": "my-app",
    "domain": "myapp.example.com",
    "repository": "https://github.com/user/my-app.git",
    "branch": "main",
    "status": "running",
    "port": 3000,
    "environment": {
      "NODE_ENV": "production",
      "API_KEY": "secret-key"
    },
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "lastDeployed": "2024-01-01T00:00:00.000Z"
  }
}
```

#### DELETE /api/projects/:id

Delete a project.

**Parameters:**
- `id` (string): Project ID

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully"
}
```

#### POST /api/projects/:id/restart

Restart a project.

**Parameters:**
- `id` (string): Project ID

**Response:**
```json
{
  "success": true,
  "message": "Project restarted successfully"
}
```

#### GET /api/projects/:id/logs

Get project logs.

**Parameters:**
- `id` (string): Project ID

**Query Parameters:**
- `lines` (number): Number of log lines to retrieve (1-10000, default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    "2024-01-01T00:00:00.000Z [INFO] Server started on port 3000",
    "2024-01-01T00:00:01.000Z [INFO] Database connected",
    "2024-01-01T00:00:02.000Z [INFO] Application ready"
  ]
}
```

#### GET /api/projects/:id/status

Get project status and container information.

**Parameters:**
- `id` (string): Project ID

**Response:**
```json
{
  "success": true,
  "data": {
    "project": {
      "id": "my-app-1234567890",
      "name": "my-app",
      "status": "running"
    },
    "containers": [
      {
        "name": "my-app",
        "status": "running",
        "ports": "3000/tcp",
        "created": "2024-01-01T00:00:00.000Z"
      }
    ],
    "status": "running",
    "uptime": 3600000
  }
}
```

## WebSocket API

The API also provides WebSocket support for real-time communication.

### Connection

Connect to: `ws://localhost:3001` (or `wss://your-domain.com` in production)

### Events

#### Client Events

- `message`: Send a message to the server
- `stats`: Request server statistics
- `echo`: Request echo response
- `ping`: Ping the server

#### Server Events

- `echo`: Echo response
- `message`: Broadcast message from other clients
- `stats`: Server statistics
- `pong`: Pong response

### Example Usage

```javascript
const socket = io('ws://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to server');
});

socket.emit('stats');
socket.on('stats', (data) => {
  console.log('Server stats:', data);
});

socket.emit('message', { message: 'Hello, server!' });
socket.on('message', (data) => {
  console.log('Received message:', data);
});
```

## Security Considerations

1. **Authentication**: Always use HTTPS in production
2. **Rate Limiting**: Respect rate limits to avoid being blocked
3. **Input Validation**: All inputs are validated and sanitized
4. **CORS**: Configured for specific origins
5. **Security Headers**: Helmet.js provides security headers
6. **Command Injection**: All command execution is sanitized

## Environment Variables

### Required (Production)

- `MONGO_URL`: MongoDB connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET`: JWT secret key (min 32 characters)
- `MONGO_ROOT_PASSWORD`: MongoDB root password
- `REDIS_PASSWORD`: Redis password

### Optional

- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3001)
- `CORS_ORIGIN`: CORS origin (default: http://localhost:3000)
- `PROJECTS_DIR`: Projects directory (default: ./projects)
- `LOG_LEVEL`: Log level (default: info)

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |
| 504 | Gateway Timeout |

## Examples

### Deploy a Node.js Application

```bash
curl -X POST http://localhost:3001/api/projects/deploy \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-jwt-token" \
  -d '{
    "name": "my-node-app",
    "domain": "myapp.example.com",
    "repository": "https://github.com/user/my-node-app.git",
    "branch": "main",
    "buildCommand": "npm install && npm run build",
    "startCommand": "npm start",
    "port": 3000,
    "environment": {
      "NODE_ENV": "production",
      "DATABASE_URL": "postgresql://user:pass@localhost:5432/mydb"
    }
  }'
```

### Get Project Status

```bash
curl -X GET http://localhost:3001/api/projects/my-node-app-1234567890/status \
  -H "Authorization: Bearer your-jwt-token"
```

### Get Project Logs

```bash
curl -X GET "http://localhost:3001/api/projects/my-node-app-1234567890/logs?lines=50" \
  -H "Authorization: Bearer your-jwt-token"
```

## Support

For issues and questions, please refer to the project documentation or create an issue in the repository.