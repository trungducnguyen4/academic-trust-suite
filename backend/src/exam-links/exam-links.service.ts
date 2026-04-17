import {
  BadRequestException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isIpInAnyCidr, normalizeIp } from '../common/utils/ip.utils';
import { GenerateExamLinkDto, JoinExamLinkDto, UpdateExamLinkDto } from './dto/exam-link.dto';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExamLinksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private makeToken(): string {
    return randomBytes(32).toString('base64url');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private getAppBaseUrl() {
    return process.env.APP_BASE_URL || 'http://localhost:5173';
  }

  private async assertCanManageExam(examId: string, userId: string, role: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true, creatorId: true, startTime: true, endTime: true },
    });

    if (!exam) {
      throw new NotFoundException('Exam not found');
    }

    if (role !== 'ADMIN' && exam.creatorId !== userId) {
      throw new ForbiddenException('You do not have permission to manage links for this exam');
    }

    return exam;
  }

  async generateLink(examId: string, dto: GenerateExamLinkDto, userId: string, role: string) {
    const exam = await this.assertCanManageExam(examId, userId, role);

    const expiresAt = dto.expiryDatetime
      ? new Date(dto.expiryDatetime)
      : exam.endTime || null;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Expiry datetime must be in the future');
    }

    const token = this.makeToken();
    const tokenHash = this.hashToken(token);

    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, 10)
      : null;

    const created = await this.prisma.examLink.create({
      data: {
        examId,
        tokenHash,
        createdBy: userId,
        expiresAt,
        maxUses: dto.maxUses ?? null,
        passwordHash,
        restrictedToCourse: dto.restrictedToCourse ?? false,
        note: dto.note,
      },
      include: {
        exam: { select: { id: true, title: true } },
      },
    });

    const url = `${this.getAppBaseUrl()}/student/join/${token}`;

    try {
      if (created.exam) {
        await this.notificationsService.create({
          recipientId: userId,
          kind: 'EXAM_LINK_CREATED',
          title: 'Exam link generated',
          message: `Secure join link for ${created.exam.title} has been generated.`,
          link: `/lecturer/generate-link?examId=${examId}`,
          priority: 'normal',
          metadata: { examId, linkId: created.id },
        });
      }
    } catch {
      // Notification failures must not block link generation.
    }

    return {
      id: created.id,
      token,
      url,
      qrDataUrl: `https://quickchart.io/qr?size=240&text=${encodeURIComponent(url)}`,
      expiresAt: created.expiresAt,
      maxUses: created.maxUses,
      restrictedToCourse: created.restrictedToCourse,
      disabled: created.disabled,
    };
  }

  private async getLinkByRawToken(token: string) {
    const tokenHash = this.hashToken(token);
    const link = await this.prisma.examLink.findUnique({
      where: { tokenHash },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            courseId: true,
            duration: true,
            startTime: true,
            endTime: true,
            settings: true,
            status: true,
            course: { select: { code: true, name: true } },
          },
        },
      },
    });

    if (!link) {
      throw new NotFoundException('Invalid exam link');
    }

    return link;
  }

  private async validateEligibility(link: any, userId?: string, ip?: string) {
    if (link.disabled) {
      throw new ForbiddenException('Link has been revoked');
    }

    if (link.lockedUntil && new Date(link.lockedUntil).getTime() > Date.now()) {
      throw new ForbiddenException('Link is temporarily locked due to multiple failed password attempts');
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
      throw new GoneException('Link expired or no longer valid');
    }

    if (link.maxUses != null && link.usedCount >= link.maxUses) {
      throw new GoneException('Link expired or no longer valid');
    }

    if (link.exam.status !== 'PUBLISHED' && link.exam.status !== 'ONGOING') {
      throw new ForbiddenException('Exam is not available');
    }

    if (link.exam.startTime && new Date(link.exam.startTime).getTime() > Date.now()) {
      throw new ForbiddenException('Exam has not started yet');
    }

    if (link.exam.endTime && new Date(link.exam.endTime).getTime() < Date.now()) {
      throw new ForbiddenException('Exam has ended');
    }

    if (link.restrictedToCourse) {
      if (!userId) {
        throw new UnauthorizedException('Please login to continue');
      }

      const enrollment = await this.prisma.enrollment.findFirst({
        where: {
          studentId: userId,
          courseId: link.exam.courseId,
          status: 'ACTIVE',
        },
      });

      if (!enrollment) {
        throw new ForbiddenException('You are not eligible for this exam link');
      }
    }

    // Check optional IP restrictions defined on the exam settings
    try {
      const allowedCidrs = Array.isArray(link?.exam?.settings?.allowedIpCidrs)
        ? link.exam.settings.allowedIpCidrs
        : null;
      if (allowedCidrs && allowedCidrs.length > 0) {
        if (!ip) throw new ForbiddenException('Access restricted to approved IP ranges');
        const allowed = isIpInAnyCidr(normalizeIp(ip), allowedCidrs as string[]);
        if (!allowed) throw new ForbiddenException('Access denied: outside allowed lab network');
      }
    } catch (e) {
      // If IP check fails due to malformed config, default to deny
      if (e instanceof ForbiddenException) throw e;
      throw new ForbiddenException('Access restricted by network policy');
    }
  }

  async validateToken(token: string) {
    const link = await this.getLinkByRawToken(token);

    if (link.disabled) {
      throw new ForbiddenException('Link has been revoked');
    }

    if (link.lockedUntil && new Date(link.lockedUntil).getTime() > Date.now()) {
      throw new ForbiddenException('Link is temporarily locked due to multiple failed password attempts');
    }

    if (link.expiresAt && new Date(link.expiresAt).getTime() <= Date.now()) {
      throw new GoneException('Link expired or no longer valid');
    }

    if (link.maxUses != null && link.usedCount >= link.maxUses) {
      throw new GoneException('Link expired or no longer valid');
    }

    return {
      valid: true,
      requiresPassword: !!link.passwordHash,
      requiresAuth: !!link.restrictedToCourse,
      examId: link.exam.id,
      examTitle: link.exam.title,
      course: link.exam.course,
      joinUrl: `/student/exam-ready?examId=${link.exam.id}`,
      expiresAt: link.expiresAt,
      maxUses: link.maxUses,
      usedCount: link.usedCount,
    };
  }

  async joinByToken(token: string, dto: JoinExamLinkDto, context: { userId?: string; ip?: string; userAgent?: string }) {
    const link = await this.getLinkByRawToken(token);
    await this.validateEligibility(link, context.userId, context.ip);

    if (link.passwordHash) {
      const provided = dto.password || '';
      const matched = await bcrypt.compare(provided, link.passwordHash);
      if (!matched) {
        const nextAttempts = Number(link.passwordAttempts || 0) + 1;
        const shouldLock = nextAttempts >= 5;

        await this.prisma.examLink.update({
          where: { id: link.id },
          data: {
            passwordAttempts: nextAttempts,
            lockedUntil: shouldLock ? new Date(Date.now() + 10 * 60 * 1000) : null,
          },
        });

        throw new ForbiddenException('Password is required or incorrect');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const current = await tx.examLink.findUnique({ where: { id: link.id } });
      if (!current) {
        throw new NotFoundException('Invalid exam link');
      }

      if (current.disabled) {
        throw new ForbiddenException('Link has been revoked');
      }

      if (current.expiresAt && new Date(current.expiresAt).getTime() <= Date.now()) {
        throw new GoneException('Link expired or no longer valid');
      }

      if (current.maxUses != null && current.usedCount >= current.maxUses) {
        throw new GoneException('Link expired or no longer valid');
      }

      const saved = await tx.examLink.update({
        where: { id: link.id },
        data: {
          usedCount: { increment: 1 },
          lastUsedAt: new Date(),
          passwordAttempts: 0,
          lockedUntil: null,
        },
      });

      await tx.examLinkUsage.create({
        data: {
          linkId: link.id,
          userId: context.userId ?? null,
          ip: context.ip || null,
          userAgent: context.userAgent || null,
        },
      });

      return saved;
    });

    try {
      const examOwner = await this.prisma.exam.findUnique({
        where: { id: link.exam.id },
        select: { creatorId: true, title: true },
      });

      if (context.userId) {
        await this.notificationsService.create({
          recipientId: context.userId,
          kind: 'EXAM_LINK_USED',
          title: 'Exam link accepted',
          message: `You can now join ${link.exam.title}.`,
          link: `/student/exam-ready?examId=${link.exam.id}`,
          priority: 'low',
          metadata: { examId: link.exam.id, linkId: link.id },
        });
      }

      if (examOwner?.creatorId) {
        await this.notificationsService.create({
          recipientId: examOwner.creatorId,
          kind: 'EXAM_LINK_USED',
          title: 'Exam link was used',
          message: `A student joined exam ${examOwner.title} via secure link.`,
          link: `/lecturer/exam/${link.exam.id}/monitor`,
          priority: 'normal',
          metadata: { examId: link.exam.id, linkId: link.id, usedCount: updated.usedCount },
        });
      }
    } catch {
      // Notification failures must not block join by link.
    }

    return {
      valid: true,
      examId: link.exam.id,
      joinUrl: `/student/exam-ready?examId=${link.exam.id}`,
      usedCount: updated.usedCount,
      maxUses: updated.maxUses,
    };
  }

  async listByExam(examId: string, userId: string, role: string) {
    await this.assertCanManageExam(examId, userId, role);

    const links = await this.prisma.examLink.findMany({
      where: { examId },
      include: {
        creator: { select: { id: true, fullName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return links.map((link) => ({
      id: link.id,
      expiresAt: link.expiresAt,
      maxUses: link.maxUses,
      usedCount: link.usedCount,
      lastUsedAt: link.lastUsedAt,
      restrictedToCourse: link.restrictedToCourse,
      disabled: link.disabled,
      note: link.note,
      createdAt: link.createdAt,
      createdBy: link.creator,
      hasPassword: !!link.passwordHash,
      previewUrl: `${this.getAppBaseUrl()}/student/join/[hidden-token]`,
    }));
  }

  async updateLink(id: string, dto: UpdateExamLinkDto, userId: string, role: string) {
    const link = await this.prisma.examLink.findUnique({
      where: { id },
      include: {
        exam: { select: { creatorId: true } },
      },
    });

    if (!link) {
      throw new NotFoundException('Exam link not found');
    }

    if (role !== 'ADMIN' && link.exam.creatorId !== userId) {
      throw new ForbiddenException('You do not have permission to update this link');
    }

    const updated = await this.prisma.examLink.update({
      where: { id },
      data: {
        disabled: dto.disabled ?? link.disabled,
        expiresAt: dto.expiryDatetime ? new Date(dto.expiryDatetime) : link.expiresAt,
        maxUses: dto.maxUses ?? link.maxUses,
        note: dto.note ?? link.note,
      },
    });

    try {
      await this.notificationsService.create({
        recipientId: userId,
        kind: 'EXAM_LINK_UPDATED',
        title: 'Exam link updated',
        message: `Exam link settings were updated${updated.disabled ? ' and the link is now disabled' : ''}.`,
        link: `/lecturer/generate-link?examId=${link.examId}`,
        priority: updated.disabled ? 'high' : 'normal',
        metadata: { linkId: updated.id, examId: link.examId, disabled: updated.disabled },
      });
    } catch {
      // Notification failures must not block link updates.
    }

    return {
      id: updated.id,
      disabled: updated.disabled,
      expiresAt: updated.expiresAt,
      maxUses: updated.maxUses,
      usedCount: updated.usedCount,
      note: updated.note,
      updatedAt: updated.updatedAt,
    };
  }

  async usageByLink(id: string, userId: string, role: string) {
    const link = await this.prisma.examLink.findUnique({
      where: { id },
      include: {
        exam: { select: { creatorId: true } },
      },
    });

    if (!link) {
      throw new NotFoundException('Exam link not found');
    }

    if (role !== 'ADMIN' && link.exam.creatorId !== userId) {
      throw new ForbiddenException('You do not have permission to view this link usage');
    }

    return this.prisma.examLinkUsage.findMany({
      where: { linkId: id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentId: true,
          },
        },
      },
      orderBy: { usedAt: 'desc' },
    });
  }
}
