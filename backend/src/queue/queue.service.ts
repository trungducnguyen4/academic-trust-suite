import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { DistributedEventsService } from '../events/distributed-events.service';
import { RedisService, DEFAULT_REDIS } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);
  constructor(
    @InjectQueue('integrity-logs')
    private integrityLogsQueue: Queue,
    @InjectQueue('notifications')
    private notificationsQueue: Queue,
    @InjectQueue('grading')
    private gradingQueue: Queue,
    @InjectQueue('events')
    private eventsQueue: Queue,
    private prisma: PrismaService,
    private events: DistributedEventsService,
    private readonly redisService: RedisService,
  ) {}

  async enqueueIntegrityLogs(data: any): Promise<void> {
    await this.integrityLogsQueue.add(data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  async enqueueNotification(data: any): Promise<void> {
    await this.notificationsQueue.add(data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }

  async enqueueGrading(data: any): Promise<void> {
    await this.gradingQueue.add(data, {
      removeOnComplete: true,
      removeOnFail: false,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Publish an application-level event.
   * - non-critical events are published to Redis pub/sub (realtime UI)
   * - critical events are persisted to EventStore and enqueued to a durable queue for processing
   */
  async publishEvent(opts: { kind: string; payload: any; critical?: boolean; dedupId?: string; channel?: string; source?: string; }): Promise<void> {
    const { kind, payload, critical = false, dedupId, channel, source } = opts;

    const event = {
      kind,
      payload,
      timestamp: new Date().toISOString(),
      source: source || process.env.HOSTNAME || 'api-instance',
    };

    // Realtime publish for UI
    try {
      const targetChannel = channel || `events:${kind}`;
      await this.events.emitEvent(targetChannel, event);
    } catch (err) {
      this.logger.error('Realtime publish failed: ' + String(err));
    }

    if (!critical) return;

    // Durable path: persist event and enqueue for processing
    const record = await this.prisma.eventStore.create({
      data: {
        dedupId: dedupId || null,
        kind,
        payload,
        critical: true,
        source: source || process.env.HOSTNAME || 'api-instance',
      },
    });

    await this.eventsQueue.add({ eventId: record.id, event }, {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: true,
      removeOnFail: false,
    });
  }

  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.getQueue(queueName);
    if (!queue) return null;

    const counts = await queue.getJobCounts();
    return {
      queue: queueName,
      ...counts,
    };
  }

  async isQueueOverloaded(queueName: string, waitingThreshold: number): Promise<boolean> {
    try {
      const stats = await this.getQueueStats(queueName);
      if (!stats) return false;
      return (stats.waiting || 0) > waitingThreshold;
    } catch (err) {
      this.logger.error('Failed to get queue stats: ' + String(err));
      return false;
    }
  }

  private getQueue(name: string): Queue | null {
    switch (name) {
      case 'integrity-logs':
        return this.integrityLogsQueue;
      case 'notifications':
        return this.notificationsQueue;
      case 'grading':
        return this.gradingQueue;
      case 'events':
        return this.eventsQueue;
      default:
        return null;
    }
  }
}
