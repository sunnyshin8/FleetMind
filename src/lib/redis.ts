import { Redis } from "@upstash/redis";

// In-memory fallback when Redis is not available
const memoryStore = new Map<string, string>();

let _redis: Redis | null = null;

const getRedis = (): Redis | null => {
    if (_redis) return _redis;
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
        try {
            _redis = new Redis({ url, token });
            return _redis;
        } catch {
            return null;
        }
    }
    return null;
};

// Wrapper that falls back to in-memory if Redis is unavailable
export const redis = {
    async get(key: string): Promise<string | null> {
        try {
            const client = getRedis();
            if (client) {
                const data = await client.get<string>(key);
                return data ?? null;
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
            if (client) {
                await client.set(key, value);
            }
        } catch {
            // fall through — memory store already has it
        }
    },
};
