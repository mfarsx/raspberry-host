# Database Improvements Documentation

This document outlines the comprehensive database improvements implemented in the Raspberry Host project, including modern patterns, performance optimizations, and monitoring capabilities.

## Overview

The database improvements introduce a modern, scalable, and maintainable database layer with the following key features:

- **Repository Pattern**: Clean separation of data access logic
- **Modern Error Handling**: Comprehensive error management with specific error types
- **Performance Monitoring**: Real-time performance tracking and optimization
- **Health Monitoring**: Continuous database health checks and alerting
- **Backup & Recovery**: Automated backup and recovery utilities
- **Migration System**: Database schema migration management
- **Connection Pooling**: Optimized database connections with retry logic

## Architecture

### Repository Pattern

The new architecture follows the Repository pattern with the following components:

```
Controllers → Services → Repositories → Models → Database
```

#### Base Repository (`api/src/repositories/baseRepository.js`)
- Provides common CRUD operations
- Implements pagination, filtering, and sorting
- Supports transactions and bulk operations
- Includes comprehensive error handling

#### Modern Repositories
- **ModernProjectRepository**: Project-specific operations with advanced querying
- **ModernUserRepository**: User management with role-based operations

### Service Layer

#### Modern Services
- **ModernProjectService**: Business logic for project management
- **ModernUserService**: User management and authentication
- **DatabaseHealthService**: Health monitoring and diagnostics
- **DatabasePerformanceService**: Performance tracking and optimization

#### Service Factory (`api/src/services/databaseServiceFactory.js`)
- Centralized service management
- Service lifecycle management
- Health checking and monitoring

## Key Features

### 1. Modern Database Connection Management

#### Enhanced Connection Configuration (`api/src/config/database.js`)
- Connection pooling with configurable pool sizes
- Retry logic with exponential backoff
- Health monitoring with automatic reconnection
- Graceful shutdown handling
- Modern MongoDB driver options

```javascript
const options = {
  maxPoolSize: 10,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  retryWrites: true,
  retryReads: true,
  compressors: ['zstd', 'zlib'],
  writeConcern: { w: 'majority', j: true },
  readPreference: 'primaryPreferred'
};
```

### 2. Comprehensive Error Handling

#### Database Error Classes (`api/src/utils/databaseErrors.js`)
- **DatabaseError**: Base error class with status codes
- **ConnectionError**: Connection-related errors
- **ValidationError**: Data validation errors
- **NotFoundError**: Resource not found errors
- **DuplicateKeyError**: Unique constraint violations
- **QueryError**: Query execution errors
- **TransactionError**: Transaction-related errors

#### Error Handler
- Automatic error classification and transformation
- Consistent error responses
- Detailed error logging
- Client-friendly error messages

### 3. Database Migrations

#### Migration System (`api/src/utils/databaseMigration.js`)
- Version-controlled schema changes
- Automatic migration execution
- Rollback capabilities
- Migration status tracking

#### Predefined Migrations
1. **Compound Indexes**: Performance optimization indexes
2. **Soft Delete Fields**: Add soft delete capabilities
3. **Project Metadata**: Enhanced project tracking
4. **User Preferences**: User settings and preferences

### 4. Data Validation and Sanitization

#### Database Validator (`api/src/utils/databaseValidator.js`)
- Input sanitization for all data types
- Email, username, and password validation
- Domain and URL validation
- Environment variable validation
- Pagination and sorting validation

### 5. Performance Monitoring

#### Real-time Performance Tracking
- Query execution time monitoring
- Slow query detection and logging
- Connection pool monitoring
- Operation count tracking
- Performance scoring system

#### Performance Metrics
- Average query execution times
- Slow query identification
- Index usage statistics
- Connection pool utilization
- Performance recommendations

### 6. Health Monitoring

#### Comprehensive Health Checks
- Database connectivity testing
- Collection statistics
- Index health monitoring
- Connection pool status
- Performance metrics analysis

#### Health Status Levels
- **Healthy**: All systems operational
- **Degraded**: Minor issues detected
- **Unhealthy**: Critical issues requiring attention

### 7. Backup and Recovery

#### Automated Backup System (`api/src/utils/databaseBackup.js`)
- Full database backups
- Incremental backup support
- Compression and encryption
- Backup validation
- Automatic cleanup of old backups

#### Recovery Features
- Point-in-time recovery
- Selective collection restoration
- Backup integrity validation
- Rollback capabilities

## Updated Models

### Project Model Enhancements
- **Soft Delete**: `isDeleted`, `deletedAt` fields
- **Metadata**: Flexible metadata storage
- **Health Tracking**: `healthStatus`, `lastHealthCheck` fields

### User Model Enhancements
- **Soft Delete**: `isDeleted`, `deletedAt` fields
- **Preferences**: Theme, language, notification settings
- **Settings**: Email notifications, project updates, system alerts

## Modern Controllers

### ModernProjectController
- Advanced filtering and search capabilities
- Pagination with sorting options
- Bulk operations support
- Availability checking endpoints
- Statistics and metrics endpoints

### ModernUserController
- User management with role-based access
- Advanced user search and filtering
- Bulk user operations
- Profile management endpoints
- Statistics and analytics

### DatabaseHealthController
- Comprehensive health monitoring endpoints
- Performance metrics and recommendations
- Backup and recovery management
- Real-time monitoring controls

## Configuration

### Environment Variables

#### Database Connection
```bash
MONGO_URL=mongodb://localhost:27017/raspberry_host
MONGO_MAX_POOL_SIZE=10
MONGO_SERVER_SELECTION_TIMEOUT=5000
MONGO_SOCKET_TIMEOUT=45000
MONGO_CONNECT_TIMEOUT=10000
MONGO_MAX_IDLE_TIME=30000
```

#### Performance Monitoring
```bash
DB_PERFORMANCE_MONITORING=true
SLOW_QUERY_THRESHOLD=100
MAX_SLOW_QUERIES=1000
```

#### Backup Configuration
```bash
AUTO_BACKUP_ENABLED=true
AUTO_BACKUP_INTERVAL=daily
MAX_DB_BACKUPS=10
BACKUP_COMPRESSION=true
```

## API Endpoints

### Project Management
- `GET /api/projects` - List projects with advanced filtering
- `POST /api/projects` - Create new project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Soft delete project
- `GET /api/projects/search` - Advanced project search
- `GET /api/projects/statistics` - Project statistics
- `GET /api/projects/health-metrics` - Project health metrics

### User Management
- `GET /api/users` - List users with filtering
- `POST /api/users` - Create new user
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Soft delete user
- `GET /api/users/search` - Advanced user search
- `GET /api/users/statistics` - User statistics
- `PUT /api/users/:id/roles` - Update user roles

### Database Health
- `GET /api/database/health` - Database health status
- `GET /api/database/performance` - Performance metrics
- `GET /api/database/slow-queries` - Slow query analysis
- `GET /api/database/recommendations` - Performance recommendations
- `POST /api/database/backup` - Create backup
- `GET /api/database/backups` - List backups
- `POST /api/database/backups/:name/restore` - Restore backup

## Usage Examples

### Creating a Project
```javascript
const projectData = {
  name: 'my-project',
  domain: 'myproject.example.com',
  repository: 'https://github.com/user/repo.git',
  port: 3000,
  environment: {
    NODE_ENV: 'production',
    API_KEY: 'secret-key'
  }
};

const project = await modernProjectService.createProject(projectData, userId);
```

### Advanced Project Search
```javascript
const searchCriteria = {
  query: 'react',
  status: 'running',
  dateRange: {
    start: '2024-01-01',
    end: '2024-12-31'
  },
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
  limit: 10
};

const results = await modernProjectService.searchProjects(searchCriteria);
```

### Performance Monitoring
```javascript
const metrics = await databasePerformanceService.getPerformanceMetrics();
console.log('Performance Score:', metrics.summary.performanceScore);
console.log('Slow Queries:', metrics.slowQueries.count);
```

### Health Monitoring
```javascript
const health = await databaseHealthService.getDatabaseHealth();
console.log('Database Status:', health.overall);
console.log('Connection Status:', health.connection.isConnected);
```

## Migration Guide

### From Legacy Controllers

1. **Update Route Handlers**: Replace direct model access with service calls
2. **Error Handling**: Use the new error handling system
3. **Validation**: Implement input validation using DatabaseValidator
4. **Pagination**: Use the built-in pagination system

### Example Migration

#### Before (Legacy)
```javascript
async getProjectById(req, res) {
  try {
    const project = await Project.findById(req.params.id);
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
```

#### After (Modern)
```javascript
async getProjectById(req, res) {
  return this.handleSingleResource(req, res, async (req, res) => {
    const { id } = req.params;
    const userId = req.user?.id;
    return await this.projectService.getProjectById(id, userId);
  }, 'Project');
}
```

## Best Practices

### 1. Service Usage
- Always use services instead of direct model access
- Implement proper error handling
- Use the repository pattern for data access

### 2. Performance
- Monitor slow queries regularly
- Use appropriate indexes
- Implement connection pooling
- Use pagination for large datasets

### 3. Security
- Validate all input data
- Implement proper access controls
- Use soft deletes for data retention
- Regular backup and recovery testing

### 4. Monitoring
- Enable health monitoring
- Set up performance alerts
- Regular backup verification
- Monitor connection pool usage

## Troubleshooting

### Common Issues

#### Connection Issues
- Check MongoDB connection string
- Verify network connectivity
- Check connection pool settings
- Review timeout configurations

#### Performance Issues
- Analyze slow queries
- Check index usage
- Monitor connection pool
- Review query patterns

#### Migration Issues
- Check migration status
- Verify database permissions
- Review migration logs
- Test rollback procedures

### Debugging Tools

#### Health Check
```bash
curl http://localhost:3001/api/database/health
```

#### Performance Metrics
```bash
curl http://localhost:3001/api/database/performance
```

#### Slow Queries
```bash
curl http://localhost:3001/api/database/slow-queries
```

## Future Enhancements

### Planned Features
- **Read Replicas**: Support for read-only replicas
- **Sharding**: Horizontal scaling capabilities
- **Caching**: Redis integration for query caching
- **Analytics**: Advanced analytics and reporting
- **Audit Logging**: Comprehensive audit trails

### Performance Optimizations
- **Query Optimization**: Automatic query optimization
- **Index Management**: Dynamic index creation
- **Connection Pooling**: Advanced pool management
- **Compression**: Data compression for storage

## Conclusion

The database improvements provide a robust, scalable, and maintainable foundation for the Raspberry Host project. The new architecture ensures:

- **Reliability**: Comprehensive error handling and monitoring
- **Performance**: Optimized queries and connection management
- **Scalability**: Repository pattern and service architecture
- **Maintainability**: Clean separation of concerns
- **Observability**: Health monitoring and performance tracking

These improvements position the project for future growth and provide the tools necessary for effective database management and optimization.