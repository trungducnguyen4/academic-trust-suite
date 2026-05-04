import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueService } from './queue.service';
import { IntegrityLogsProcessor } from './processors/integrity-logs.processor';
import { NotificationsProcessor } from './processors/notifications.processor';
import { GradingProcessor } from './processors/grading.processor';
import { EventsProcessor } from './processors/events.processor';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BullModule.registerQueue(
      { name: 'integrity-logs' },
      { name: 'notifications' },
      { name: 'grading' },
      { name: 'events' },
    ),
    PrismaModule,
    NotificationsModule,
    // events module used for realtime pub/sub
    EventsModule,
  ],
  providers: [
    QueueService,
    IntegrityLogsProcessor,
    NotificationsProcessor,
    GradingProcessor,
    EventsProcessor,
    // events processor will be dynamically loaded below
  ],
  exports: [QueueService],
})
export class QueueModule {}
