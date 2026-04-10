import { Module } from '@nestjs/common';
import { ExamsService } from './exams.service';
import { ExamsController } from './exams.controller';
import { MailerModule } from '../mailer/mailer.module';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  imports: [MailerModule, EnrollmentsModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
