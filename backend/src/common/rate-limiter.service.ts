import { Injectable, Logger } from '@nestjs/common';
import { RedisService, DEFAULT_REDIS } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private readonly redis: Redis;

  // Lua token-bucket script: returns { allowed(1/0), remainingTokens, retryAfterMs }
  private tokenBucketScript = `
    local key = KEYS[1]
    local capacity = tonumber(ARGV[1])
    local rate = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])
    local requested = tonumber(ARGV[4])

    local row = redis.call('HMGET', key, 'tokens', 'ts')
    local tokens = tonumber(row[1]) or capacity
    local ts = tonumber(row[2]) or now

    local delta = math.max(0, now - ts)
    local refill = (delta / 1000.0) * rate
    tokens = math.min(capacity, tokens + refill)

    local allowed = 0
    if tokens >= requested then
      allowed = 1
      tokens = tokens - requested
    end

    redis.call('HMSET', key, 'tokens', tokens, 'ts', now)
    -- expire after 2x time to fully refill (fallback)
    local ttl = math.ceil(math.max(1000, (capacity / math.max(1, rate)) * 1000 * 2))
    redis.call('PEXPIRE', key, ttl)

    local remaining = math.floor(tokens)
    local retryAfter = 0
    if allowed == 0 then
      retryAfter = math.ceil(((requested - tokens) / rate) * 1000)
      if retryAfter < 0 then retryAfter = 0 end
    end
    return { allowed, remaining, retryAfter }
  `;

  constructor(private readonly redisService: RedisService) {
    this.redis = this.redisService.getOrThrow(DEFAULT_REDIS);
  }

  async consume(key: string, capacity: number, refillPerSecond: number, tokens = 1) {
    const now = Date.now();
    try {
      const res: any = await this.redis.eval(this.tokenBucketScript, 1, key, capacity, refillPerSecond, now, tokens);
      // res: [allowed(1|0), remaining, retryAfterMs]
      const allowed = Number(res[0]) === 1;
      const remaining = Number(res[1]);
      const retryAfter = Number(res[2]);
      return { allowed, remaining, retryAfter };
    } catch (err) {
      this.logger.error('RateLimiter eval failed: ' + String(err));
      // On Redis error, fall back to allowing (fail-open) to avoid blocking students.
      return { allowed: true, remaining: 0, retryAfter: 0 };
    }
  }
}
