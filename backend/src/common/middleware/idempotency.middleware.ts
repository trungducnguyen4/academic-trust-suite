import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

export interface IdempotencyStore {
  get(key: string): Promise<any>;
  set(key: string, value: any, ttl: number): Promise<void>;
  has(key: string): Promise<boolean>;
}

@Injectable()
export class IdempotencyMiddleware implements NestMiddleware {
  // Simple in-memory store for now (should be replaced with Redis)
  private store = new Map<string, { value: any; expiresAt: number }>();

  use(req: Request, res: Response, next: NextFunction) {
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // Only apply to POST/PUT/PATCH requests
    if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !idempotencyKey) {
      return next();
    }

    // Check if request was already processed
    const stored = this.store.get(idempotencyKey);
    if (stored && stored.expiresAt > Date.now()) {
      // Return cached response
      return res.status(stored.value.statusCode).json(stored.value.body);
    }

    // Clean up expired entries
    if (stored && stored.expiresAt <= Date.now()) {
      this.store.delete(idempotencyKey);
    }

    // Capture the original send to store response
    const originalSend = res.send.bind(res);
    const middleware = this;
    
    res.send = function (body: any) {
      // Store the response for 5 minutes (300000 ms)
      const TTL = 5 * 60 * 1000;
      if (res.statusCode < 400) {
        const storedBody = typeof body === 'string' ? JSON.parse(body) : body;
        middleware.store.set(idempotencyKey, {
          value: { statusCode: res.statusCode, body: storedBody },
          expiresAt: Date.now() + TTL,
        });
      }
      return originalSend(body);
    };

    next();
  }
}
