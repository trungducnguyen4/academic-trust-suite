import { Module } from '@nestjs/common';
import { DistributedEventsService } from './distributed-events.service';
import { SharedRedisModule } from '../redis/redis.module';

@Module({
  imports: [SharedRedisModule],
  providers: [DistributedEventsService],
  exports: [DistributedEventsService],
})
export class EventsModule {}
