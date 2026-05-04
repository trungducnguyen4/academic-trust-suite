import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { MailerModule } from '../mailer/mailer.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AccessPolicyService } from '../common/services/access-policy.service';

@Module({
  imports: [MailerModule, EnrollmentsModule, NotificationsModule],
  controllers: [ExamsController],
  providers: [ExamsService, AccessPolicyService],
  exports: [ExamsService, AccessPolicyService],
})
export class ExamsModule {}
