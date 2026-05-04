import { Injectable } from '@nestjs/common';
import { RedisService, DEFAULT_REDIS } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import { Subject, Observable, fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class DistributedEventsService {
  private readonly redis: Redis;
  private readonly redisSubscriber: Redis;
  private readonly redisPub: Redis;
  private eventSubjects = new Map<string, Subject<any>>();

  constructor(private readonly redisService: RedisService) {
    // Obtain the default client and create separate clients for pub/sub
    this.redis = this.redisService.getOrThrow(DEFAULT_REDIS);
    this.redisSubscriber = this.redis.duplicate();
    this.redisPub = this.redis.duplicate();
  }

  // Emit event to Redis channel
  async emitEvent(channel: string, event: any): Promise<void> {
    await this.redisPub.publish(channel, JSON.stringify(event));
  }

  // Subscribe to events from a channel
  subscribeToChannel(channel: string): Observable<any> {
    return new Observable((observer) => {
      this.redisSubscriber.subscribe(channel, (err) => {
        if (err) {
          observer.error(err);
          return;
        }
      });

      const messageHandler = (chan: string, message: string) => {
        if (chan === channel) {
          try {
            const event = JSON.parse(message);
            observer.next(event);
          } catch (err) {
            observer.error(err);
          }
        }
      };

      this.redisSubscriber.on('message', messageHandler);

      return () => {
        this.redisSubscriber.unsubscribe(channel);
        this.redisSubscriber.off('message', messageHandler);
      };
    });
  }

  // Emit exam event (for proctoring, submissions, etc.)
  async emitExamEvent(examId: string, event: any): Promise<void> {
    const channel = `exam:${examId}:events`;
    await this.emitEvent(channel, {
      ...event,
      timestamp: new Date().toISOString(),
      source: process.env.HOSTNAME || 'api-instance',
    });
  }

  // Subscribe to exam events
  subscribeToExamEvents(examId: string): Observable<any> {
    const channel = `exam:${examId}:events`;
    return this.subscribeToChannel(channel);
  }

  // Broadcast notification to role-based channel
  async broadcastToRole(role: string, event: any): Promise<void> {
    const channel = `role:${role}:notifications`;
    await this.emitEvent(channel, event);
  }

  subscribeToRoleNotifications(role: string): Observable<any> {
    const channel = `role:${role}:notifications`;
    return this.subscribeToChannel(channel);
  }

  // Clean up
  async disconnect(): Promise<void> {
    await this.redisSubscriber.quit();
    await this.redisPub.quit();
  }
}
