import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ExamsModule } from './exams/exams.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AiModule } from './ai/ai.module';
import { ExamLinksModule } from './exam-links/exam-links.module';
import { MailerModule } from './mailer/mailer.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QuestionsContractsModule } from './questions-v2/questions-v2-contracts.module';
import { SharedRedisModule } from './redis/redis.module';
import { QueueModule } from './queue/queue.module';
import { CacheModule } from './cache/cache.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Prefer backend/.env when running backend locally; fallback to repo root .env.
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    SharedRedisModule,
    QueueModule,
    CacheModule,
    EventsModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    ExamsModule,
    MailerModule,
    SubmissionsModule,
    AiModule,
    ExamLinksModule,
    NotificationsModule,
    QuestionsContractsModule,
  ],
})
export class AppModule {}
