import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // true for 465, false for other ports
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendExamLink(to: string | string[], subject: string, html: string, text?: string) {
    const from = process.env.EMAIL_FROM || process.env.SMTP_USER || 'no-reply@example.com';
    const recipients = Array.isArray(to) ? to.join(',') : to;
    try {
      const info = await this.transporter.sendMail({
        from,
        to: recipients,
        subject,
        html,
        text,
      });
      this.logger.log(`Email sent: ${info.messageId} to ${recipients}`);
      return info;
    } catch (err) {
      this.logger.error('Failed to send email', err as any);
      throw err;
    }
  }
}
