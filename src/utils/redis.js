// import Redis from 'ioredis';

// // Create Redis client
// const redis = new Redis({
//   host: process.env.REDIS_HOST || 'localhost',
//   port: process.env.REDIS_PORT || 6379,
//   password: process.env.REDIS_PASSWORD || undefined,
//   retryStrategy: (times) => {
//     const delay = Math.min(times * 50, 2000);
//     return delay;
//   },
//   maxRetriesPerRequest: 3,
//   enableReadyCheck: true,
//   enableOfflineQueue: false,
// });

// // Event handlers
// redis.on('connect', () => {
//   console.log('✅ Redis connected');
// });

// redis.on('ready', () => {
//   console.log('✅ Redis ready');
// });

// redis.on('error', (err) => {
//   console.error('❌ Redis error:', err.message);
// });

// redis.on('close', () => {
//   console.log('⚠️ Redis connection closed');
// });

// redis.on('reconnecting', (ms) => {
//   console.log(`🔄 Redis reconnecting in ${ms}ms`);
// });

// // Cache helper functions
// const cache = {
//   /**
//    * Get cached data
//    * @param {string} key - Cache key
//    * @returns {Promise<object|null>} - Cached data or null
//    */
//   async get(key) {
//     try {
//       const data = await redis.get(key);
//       return data ? JSON.parse(data) : null;
//     } catch (error) {
//       console.error(`Redis GET error for key ${key}:`, error);
//       return null;
//     }
//   },

//   /**
//    * Set cached data with TTL
//    * @param {string} key - Cache key
//    * @param {any} value - Data to cache
//    * @param {number} ttlSeconds - Time to live in seconds (default: 300 = 5 minutes)
//    * @returns {Promise<boolean>} - Success status
//    */
//   async set(key, value, ttlSeconds = 300) {
//     try {
//       const serialized = JSON.stringify(value);
//       await redis.setex(key, ttlSeconds, serialized);
//       return true;
//     } catch (error) {
//       console.error(`Redis SET error for key ${key}:`, error);
//       return false;
//     }
//   },

//   /**
//    * Delete cached data
//    * @param {string} key - Cache key
//    * @returns {Promise<boolean>} - Success status
//    */
//   async delete(key) {
//     try {
//       await redis.del(key);
//       return true;
//     } catch (error) {
//       console.error(`Redis DELETE error for key ${key}:`, error);
//       return false;
//     }
//   },

//   /**
//    * Delete multiple keys matching a pattern
//    * @param {string} pattern - Pattern to match (e.g., 'courses:*')
//    * @returns {Promise<number>} - Number of keys deleted
//    */
//   async deletePattern(pattern) {
//     try {
//       const stream = redis.scanStream({
//         match: pattern,
//         count: 100,
//       });
      
//       let deletedCount = 0;
//       const pipeline = redis.pipeline();
      
//       return new Promise((resolve, reject) => {
//         stream.on('data', (keys) => {
//           if (keys.length > 0) {
//             keys.forEach((key) => {
//               pipeline.del(key);
//               deletedCount++;
//             });
//           }
//         });
        
//         stream.on('end', async () => {
//           if (deletedCount > 0) {
//             await pipeline.exec();
//           }
//           resolve(deletedCount);
//         });
        
//         stream.on('error', (err) => {
//           console.error('Redis scan error:', err);
//           reject(err);
//         });
//       });
//     } catch (error) {
//       console.error(`Redis DELETE PATTERN error for ${pattern}:`, error);
//       return 0;
//     }
//   },

//   /**
//    * Check if key exists
//    * @param {string} key - Cache key
//    * @returns {Promise<boolean>} - Whether key exists
//    */
//   async exists(key) {
//     try {
//       const result = await redis.exists(key);
//       return result === 1;
//     } catch (error) {
//       console.error(`Redis EXISTS error for key ${key}:`, error);
//       return false;
//     }
//   },

//   /**
//    * Get or set cached data (cache-aside pattern)
//    * @param {string} key - Cache key
//    * @param {Function} fetchFn - Function to fetch data if not cached
//    * @param {number} ttlSeconds - Time to live in seconds
//    * @returns {Promise<any>} - Cached or fetched data
//    */
//   async getOrSet(key, fetchFn, ttlSeconds = 300) {
//     try {
//       // Try to get from cache
//       const cached = await cache.get(key);
//       if (cached !== null) {
//         return cached;
//       }

//       // Fetch from source
//       const data = await fetchFn();
      
//       // Store in cache
//       if (data !== null && data !== undefined) {
//         await cache.set(key, data, ttlSeconds);
//       }
      
//       return data;
//     } catch (error) {
//       console.error(`Redis GETORSET error for key ${key}:`, error);
//       // Fallback to direct fetch
//       return await fetchFn();
//     }
//   },
// };

// // Cache key generators
// const cacheKeys = {
//   // Course keys
//   courses: {
//     all: () => 'courses:all',
//     byId: (id) => `courses:id:${id}`,
//     search: (query) => `courses:search:${Buffer.from(query).toString('base64')}`,
//   },
  
//   // User keys
//   users: {
//     search: (query) => `users:search:${Buffer.from(query).toString('base64')}`,
//     byId: (id) => `users:id:${id}`,
//     byUsername: (username) => `users:username:${username}`,
//   },
  
//   // Challenge keys (for future use)
//   challenges: {
//     all: () => 'challenges:all',
//     byId: (id) => `challenges:id:${id}`,
//     byType: (type) => `challenges:type:${type}`,
//   },
  
//   // Quiz keys (for future use)
//   quizzes: {
//     all: () => 'quizzes:all',
//     byId: (id) => `quizzes:id:${id}`,
//   },
// };

// export default redis;
// export { cache, cacheKeys };

// src/utils/redis.js (Safe Version)

// src/utils/redis.js

console.log("⚠️ Redis disabled: Using robust dummy mocks");

// 1. Mock the main Redis client (Default export)
const redis = {
  connect: async () => {},
  disconnect: async () => {},
  on: () => {},
  isOpen: false,
  get: async () => null,
  set: async () => null,
  del: async () => null,
  ping: async () => 'pong',
};

// 2. Mock the 'cache' helper (Named export)
export const cache = {
  get: async () => null,
  set: async () => null,
  del: async () => null,
  
  // CRITICAL: This mocks the "getOrSet" pattern.
  // Instead of caching, it just runs the fetch function immediately.
  // This ensures your app actually gets data from MongoDB!
  getOrSet: async (key, ttl, fetchFn) => {
    // Handle case: getOrSet(key, fetchFn) - 2 args
    if (typeof ttl === 'function') {
        return await ttl();
    }
    // Handle case: getOrSet(key, ttl, fetchFn) - 3 args
    if (typeof fetchFn === 'function') {
        return await fetchFn();
    }
    return null;
  },
};

// 3. Mock 'cacheKeys' (Named export)
// We use a Proxy to catch ANY key your app tries to access (e.g. cacheKeys.USER_PROFILE)
// and prevent it from crashing with "undefined" errors.
export const cacheKeys = new Proxy({}, {
  get: (target, prop) => {
    // Return a dummy function in case the key is used like: cacheKeys.USER(id)
    const mockKeyFn = () => "dummy-key";
    // Also allow it to be used as a string
    mockKeyFn.toString = () => "dummy-key";
    return mockKeyFn;
  }
});

export default redis;