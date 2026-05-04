import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { Logger } from '@nestjs/common';

@Processor('integrity-logs')
export class IntegrityLogsProcessor {
  private readonly logger = new Logger(IntegrityLogsProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process()
  async processIntegrityLogs(job: Job<any>): Promise<void> {
    const { submissionId, proctoringId, logs } = job.data;

    try {
      // Batch insert integrity logs
      if (logs && logs.length > 0) {
        await this.prisma.integrityLog.createMany({
          data: logs.map((log: any) => ({
            proctoringId,
            eventType: log.eventType,
            details: log.details,
            timestamp: log.timestamp || new Date(),
          })),
        });
      }

      this.logger.log(
        `Processed ${logs?.length || 0} integrity logs for submission ${submissionId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to process integrity logs: ${(error as any)?.message || String(error)}`,
        (error as Error)?.stack,
      );
      throw error; // Re-throw to trigger retries
    }
  }
}
