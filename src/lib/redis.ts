import Redis from "ioredis";

// In-memory fallback when Redis is not available
const memoryStore = new Map<string, string>();

const createRedisClient = () => {
    const url = process.env.UPSTASH_REDIS_REST_URL || "redis://localhost:6379";
    try {
        const client = new Redis(url, {
            maxRetriesPerRequest: 1,
            retryStrategy: () => null, // Don't retry — fail fast
            lazyConnect: true,
            connectTimeout: 3000,
        });
        client.on("error", () => {
            // Silently swallow connection errors — we fall back to memory store
        });
        return client;
    } catch {
        return null;
    }
};

let _redis: Redis | null = null;

const getRedis = () => {
    if (!_redis) {
        _redis = createRedisClient();
    }
    return _redis;
};

// Wrapper that falls back to in-memory if Redis is unavailable
export const redis = {
    async get(key: string): Promise<string | null> {
        try {
            const client = getRedis();
            if (client) {
                await client.connect().catch(() => { });
                if (client.status === "ready") {
                    return await client.get(key);
                }
            }
        } catch {
            // fall through
        }
        return memoryStore.get(key) ?? null;
    },
    async set(key: string, value: string): Promise<void> {
        memoryStore.set(key, value);
        try {
            const client = getRedis();
            if (client && client.status === "ready") {
                await client.set(key, value);
            }
        } catch {
            // fall through — memory store already has it
        }
    },
};
