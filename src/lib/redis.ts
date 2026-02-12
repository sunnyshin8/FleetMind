import Redis from "ioredis";

const getRedisUrl = () => {
    if (process.env.UPSTASH_REDIS_REST_URL) {
        return process.env.UPSTASH_REDIS_REST_URL;
    }
    return "redis://localhost:6379";
};

export const redis = new Redis(getRedisUrl());
