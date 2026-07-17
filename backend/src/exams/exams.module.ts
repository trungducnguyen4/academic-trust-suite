import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { ExamQualityReviewService } from './exam-quality-review.service';
import { MailerModule } from '../mailer/mailer.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { AiModule } from '../ai/ai.module';
import { AccessPolicyService } from '../common/services/access-policy.service';

@Module({
  imports: [MailerModule, EnrollmentsModule, NotificationsModule, SubmissionsModule, AiModule],
  controllers: [ExamsController],
  providers: [ExamsService, AccessPolicyService, ExamQualityReviewService],
  exports: [ExamsService, AccessPolicyService],
})
export class ExamsModule {}
