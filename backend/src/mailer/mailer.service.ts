import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com');
    const port = Number(this.configService.get<number>('SMTP_PORT', 587));
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const allowSelfSigned = this.configService.get<string>('MAILER_ALLOW_SELF_SIGNED', 'false') === 'true' && process.env.NODE_ENV !== 'production';

    const transportOptions = {
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
      requireTLS: true,
      tls: allowSelfSigned ? { rejectUnauthorized: false } : { rejectUnauthorized: true },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      greetingTimeout: 10000,
      connectionTimeout: 10000,
    };

    // If a path to a custom CA is provided, load it and add to tls.ca
    const caPath = this.configService.get<string>('SMTP_CA_PATH');
    if (caPath) {
      try {
        const ca = fs.readFileSync(caPath, 'utf8');
        (transportOptions as any).tls = { ...( (transportOptions as any).tls || {} ), ca: [ca] };
        this.logger.log(`Loaded SMTP CA certificate from ${caPath}`);
      } catch (err) {
        this.logger.warn(`Failed to read SMTP_CA_PATH (${caPath})`, err as any);
      }
    }

    this.transporter = nodemailer.createTransport(transportOptions);

    this.transporter
      .verify()
      .then(() => this.logger.log('Mailer transport verified'))
      .catch((err) => this.logger.warn('Mailer transport verification failed', err));
  }

  async sendExamLink(to: string | string[], subject: string, html: string, text?: string) {
    const from = this.configService.get<string>('EMAIL_FROM') || this.configService.get<string>('SMTP_USER') || 'no-reply@example.com';
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
