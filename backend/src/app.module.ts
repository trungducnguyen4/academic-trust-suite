import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { ExamsModule } from './exams/exams.module';
import { QuestionsModule } from './questions/questions.module';
import { SubmissionsModule } from './submissions/submissions.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Prefer backend/.env when running backend locally; fallback to repo root .env.
      envFilePath: ['.env', '../.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    ExamsModule,
    QuestionsModule,
    SubmissionsModule,
    AiModule,
  ],
})
export class AppModule {}
