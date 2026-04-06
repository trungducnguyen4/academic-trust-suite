import { Module } from '@nestjs/common';
import { ExamLinksService } from './exam-links.service';
import { ExamLinksController } from './exam-links.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [ExamLinksController],
  providers: [ExamLinksService],
})
export class ExamLinksModule {}
