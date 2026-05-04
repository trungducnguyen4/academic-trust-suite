import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { NotificationsService } from '../../notifications/notifications.service';
import { Logger } from '@nestjs/common';

@Processor('notifications')
export class NotificationsProcessor {
  private readonly logger = new Logger(NotificationsProcessor.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @Process()
  async processNotification(job: Job<any>): Promise<void> {
    const { type, recipientId, data } = job.data;

    try {
      switch (type) {
        case 'submission_received':
          await this.notificationsService.create({
            recipientId,
            kind: 'SUBMISSION_RECEIVED',
            title: data.title,
            message: data.message,
            link: data.link,
            priority: data.priority || 'normal',
            metadata: data.metadata,
          });
          break;

        case 'integrity_risk':
          await this.notificationsService.create({
            recipientId,
            kind: 'INTEGRITY_RISK_DETECTED',
            title: data.title,
            message: data.message,
            link: data.link,
            priority: data.priority || 'high',
            metadata: data.metadata,
          });
          break;

        case 'role_broadcast':
          await this.notificationsService.createForRole(recipientId, {
            kind: data.kind,
            title: data.title,
            message: data.message,
            link: data.link,
            priority: data.priority || 'normal',
            metadata: data.metadata,
          });
          break;

        default:
          this.logger.warn(`Unknown notification type: ${type}`);
      }

      this.logger.log(`Processed notification for recipient: ${recipientId}`);
    } catch (error) {
      this.logger.error(
        `Failed to process notification: ${(error as any)?.message || String(error)}`,
        (error as Error)?.stack,
      );
      throw error; // Re-throw to trigger retries
    }
  }
}
