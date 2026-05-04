import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('grading')
export class GradingProcessor {
  private readonly logger = new Logger(GradingProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process()
  async processGrading(job: Job<any>): Promise<void> {
    const { submissionId, examId } = job.data;

    try {
      // Fetch submission to check status
      const submission = await this.prisma.examSubmission.findUnique({
        where: { id: submissionId },
        include: {
          exam: {
            select: {
              examQuestions: {
                include: {
                  question: true,
                },
              },
            },
          },
          answers: true,
        },
      });

      if (!submission) {
        this.logger.warn(`Submission not found: ${submissionId}`);
        return;
      }

      // Check if there are manual-grade questions
      const autoGradedTypes = ['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE'];
      const hasManualGrading = submission.exam.examQuestions.some(
        (eq) => !autoGradedTypes.includes(eq.question.type),
      );

      // If all questions are auto-graded, mark as GRADED
      if (!hasManualGrading) {
        await this.prisma.examSubmission.update({
          where: { id: submissionId },
          data: { status: 'GRADED', gradedAt: new Date() },
        });

        this.logger.log(
          `Auto-grading completed for submission ${submissionId}`,
        );
      } else {
        // Manual grading pending (keep as SUBMITTED until lecturer grades)
        this.logger.log(
          `Submission ${submissionId} awaiting manual grading`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process grading: ${(error as any)?.message || String(error)}`,
        (error as Error)?.stack,
      );
      throw error; // Re-throw to trigger retries
    }
  }
}
