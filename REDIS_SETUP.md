# Redis Setup & Caching Guide

## Overview

Redis has been integrated into the Hexagon backend to optimize database queries and improve performance through intelligent caching.

## Installation

Redis client (`ioredis`) has been installed. Make sure Redis server is running:

```bash
# macOS
brew services start redis

# Ubuntu/Debian
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:latest

# Windows (using WSL or Docker)
```

## Configuration

Add these environment variables to your `.env` file:

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=  # Optional, leave empty for local development
```

## Caching Implementation

### Courses

**Cached Endpoints:**
- `GET /courses` - All courses (5 minutes TTL)
- `GET /courses/:id` - Single course (10 minutes TTL)

**Cache Invalidation:**
- Automatically invalidated when:
  - Course is created (`POST /courses`)
  - Course is updated (`PUT /courses/:id`)
  - Course is deleted (`DELETE /courses/:id`)

### User Search

**Cached Endpoint:**
- `GET /users/search?query=...` - User search results (3 minutes TTL)

**Cache Invalidation:**
- Automatically invalidated when:
  - User profile is updated (`PUT /users/me`)

### Cache Keys Structure

```
courses:all                    # All courses list
courses:id:{courseId}         # Individual course
users:search:{base64Query}    # User search results
```

## Usage

The caching system is transparent - it automatically handles cache hits/misses and invalidation. No changes needed in your API calls.

### Manual Cache Operations (if needed)

```javascript
import { cache, cacheKeys } from '../utils/redis.js';

// Get cached data
const courses = await cache.get(cacheKeys.courses.all());

// Set cache
await cache.set(cacheKeys.courses.byId('123'), courseData, 600); // 10 min TTL

// Delete cache
await cache.delete(cacheKeys.courses.byId('123'));

// Delete pattern (all courses)
await cache.deletePattern('courses:*');
```

## Performance Benefits

- **Reduced Database Load**: Frequently accessed data served from memory
- **Faster Response Times**: Redis lookups are significantly faster than MongoDB queries
- **Better Scalability**: Handles high traffic with minimal database strain
- **Automatic Expiration**: Cache automatically expires to ensure data freshness

## Cache Strategy

1. **Cache-Aside Pattern**: Data is fetched from cache first, then database if not found
2. **Write-Through Invalidation**: Cache is invalidated on data modifications
3. **TTL-Based Expiration**: Different TTLs based on data change frequency
4. **Graceful Degradation**: If Redis fails, system falls back to direct database queries

## Monitoring

Redis connection status is logged on server startup:
- ✅ `Redis connected` - Connection successful
- ⚠️ `Redis connection failed` - Will fall back to direct queries

## Future Enhancements

Potential areas for additional caching:
- Challenge listings (when moved to backend)
- Quiz questions (when moved to backend)
- Course enrollments
- Popular posts
- User profiles
- Notification counts

