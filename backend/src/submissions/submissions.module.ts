import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsEventsService } from './submissions-events.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { QueueModule } from '../queue/queue.module';
import { AccessPolicyService } from '../common/services/access-policy.service';
import { RateLimiterService } from '../common/rate-limiter.service';
import { RateLimitGuard } from '../common/guards/rate-limit.guard';


@Module({
  imports: [NotificationsModule, QueueModule],
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsEventsService, AccessPolicyService, RateLimiterService, RateLimitGuard],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
