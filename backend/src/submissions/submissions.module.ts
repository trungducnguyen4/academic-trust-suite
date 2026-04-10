import { Module } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { SubmissionsController } from './submissions.controller';
import { SubmissionsEventsService } from './submissions-events.service';

@Module({
  controllers: [SubmissionsController],
  providers: [SubmissionsService, SubmissionsEventsService],
  exports: [SubmissionsService],
})
export class SubmissionsModule {}
