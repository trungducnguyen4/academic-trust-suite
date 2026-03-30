import { Module } from '@nestjs/common';
import { ExamLinksService } from './exam-links.service';
import { ExamLinksController } from './exam-links.controller';

@Module({
  controllers: [ExamLinksController],
  providers: [ExamLinksService],
})
export class ExamLinksModule {}
