import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY } from '../rate-limit.decorator';
import { RateLimiterService } from '../rate-limiter.service';

type LimitConfig = { capacity: number; refillPerSecond: number };

const POLICIES: Record<string, { perUser?: LimitConfig; perIp?: LimitConfig; perExam?: LimitConfig }>= {
  start: {
    perUser: { capacity: 1, refillPerSecond: 1/30 },
    perIp: { capacity: 10, refillPerSecond: 10/60 },
    perExam: { capacity: 200, refillPerSecond: 200 },
  },
  autosave: {
    perUser: { capacity: 10, refillPerSecond: 0.5 }, // 1 per 2s sustained
    perIp: { capacity: 50, refillPerSecond: 1 },
    perExam: { capacity: 1000, refillPerSecond: 1000 },
  },
  submit: {
    perUser: { capacity: 1, refillPerSecond: 1/60 },
    perIp: { capacity: 20, refillPerSecond: 20/60 },
    perExam: { capacity: 200, refillPerSecond: 200 },
  },
  integrity: {
    perUser: { capacity: 200, refillPerSecond: 10 },
    perIp: { capacity: 2000, refillPerSecond: 100 },
    perExam: { capacity: 5000, refillPerSecond: 500 },
  },
};

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private reflector: Reflector, private limiter: RateLimiterService) {}

  private ipFromRequest(req: any): string {
    const xf = req.headers?.['x-forwarded-for'];
    if (xf && typeof xf === 'string') return xf.split(',')[0].trim();
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policyName = this.reflector.get<string>(RATE_LIMIT_KEY, context.getHandler());
    if (!policyName) return true; // no policy attached

    const policy = POLICIES[policyName];
    if (!policy) return true;

    const req = context.switchToHttp().getRequest();
    const userId = req.user?.id || 'anon';
    const ip = this.ipFromRequest(req);
    const examId = req.params?.examId || req.params?.id || req.body?.examId || req.body?.submission?.examId || null;

    // check per-user
    if (policy.perUser) {
      const key = `rl:user:${userId}:${policyName}`;
      const r = await this.limiter.consume(key, policy.perUser.capacity, policy.perUser.refillPerSecond, 1);
      if (!r.allowed) throw new HttpException(`Rate limit: ${policyName} per-user. retryAfter=${r.retryAfter}ms`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // check per-ip
    if (policy.perIp) {
      const key = `rl:ip:${ip}:${policyName}`;
      const r = await this.limiter.consume(key, policy.perIp.capacity, policy.perIp.refillPerSecond, 1);
      if (!r.allowed) throw new HttpException(`Rate limit: ${policyName} per-ip. retryAfter=${r.retryAfter}ms`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // check per-exam
    if (policy.perExam && examId) {
      const key = `rl:exam:${examId}:${policyName}`;
      const r = await this.limiter.consume(key, policy.perExam.capacity, policy.perExam.refillPerSecond, 1);
      if (!r.allowed) throw new HttpException(`Rate limit: ${policyName} per-exam. retryAfter=${r.retryAfter}ms`, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
