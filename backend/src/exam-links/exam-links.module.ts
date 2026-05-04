import { Module } from '@nestjs/common';
import { ExamLinksService } from './exam-links.service';
import { ExamLinksController } from './exam-links.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccessPolicyService } from '../common/services/access-policy.service';

@Module({
  imports: [NotificationsModule],
  controllers: [ExamLinksController],
  providers: [ExamLinksService, AccessPolicyService],
})
export class ExamLinksModule {}
