import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('events')
export class EventsProcessor {
  private readonly logger = new Logger(EventsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process()
  async processEvent(job: Job<any>): Promise<void> {
    const { eventId, event } = job.data;

    try {
      // mark processing
      if (eventId) {
        await this.prisma.eventStore.update({ where: { id: eventId }, data: { status: 'PROCESSING', attempts: { increment: 1 } } });
      }

      // TODO: add concrete handling logic in consumer services (e.g. integrity handling)
      // For now we simply mark processed

      if (eventId) {
        await this.prisma.eventStore.update({ where: { id: eventId }, data: { status: 'PROCESSED', processedAt: new Date() } });
      }

      this.logger.log(`Processed durable event ${event?.kind || '[unknown]'}`);
    } catch (err) {
      this.logger.error(`Failed processing event: ${(err as any)?.message || err}`);
      if (eventId) {
        const record = await this.prisma.eventStore.findUnique({ where: { id: eventId } });
        const attempts = (record?.attempts || 0) + 1;
        const maxAttempts = 5;
        if (attempts >= maxAttempts) {
          await this.prisma.eventStore.update({ where: { id: eventId }, data: { status: 'FAILED', lastError: String((err as Error)?.message || err) } });
        } else {
          await this.prisma.eventStore.update({ where: { id: eventId }, data: { attempts, lastError: String((err as Error)?.message || err) } });
        }
      }
      throw err; // let Bull handle retry/backoff
    }
  }
}
