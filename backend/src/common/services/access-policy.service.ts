import { Injectable, Logger } from '@nestjs/common';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizeIp, isIpInAnyCidr } from '../utils/ip.utils';

@Injectable()
export class AccessPolicyService {
  private readonly logger = new Logger(AccessPolicyService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Resolve the client's apparent IP address taking into account trusted proxy CIDRs.
   * If the remote (socket) address belongs to a trusted proxy, the X-Forwarded-For
   * header is examined and the left-most untrusted IP is returned.
   */
  resolveClientIpFromParts(remoteIpRaw?: string | null, forwardedForRaw?: string | null): string | null {
    const remoteIp = normalizeIp(remoteIpRaw || null);
    const xff = typeof forwardedForRaw === 'string' ? forwardedForRaw : (forwardedForRaw ? String(forwardedForRaw) : null);

    const trustedRaw = process.env.TRUSTED_PROXY_CIDRS || '';
    const trustedCidrs = trustedRaw.split(',').map((s) => s.trim()).filter(Boolean);

    if (trustedCidrs.length > 0 && isIpInAnyCidr(remoteIp, trustedCidrs)) {
      // remote is a trusted proxy — parse X-Forwarded-For and pick first untrusted IP
      if (xff) {
        const parts = xff.split(',').map((p) => normalizeIp(p.trim())).filter(Boolean);
        for (const p of parts) {
          if (!isIpInAnyCidr(p, trustedCidrs)) {
            return p;
          }
        }
        // fallback to first part if all are trusted
        return parts[0] || remoteIp;
      }
      return remoteIp;
    }

    // Not behind a trusted proxy — do not trust X-Forwarded-For header
    return xff ? normalizeIp(xff.split(',')[0].trim()) || remoteIp : remoteIp;
  }

  resolveClientIp(req: Request): string | null {
    const remote = req?.socket?.remoteAddress || (req as any)?.ip || null;
    const xff = req?.headers?.['x-forwarded-for'] as string | undefined;
    return this.resolveClientIpFromParts(remote, xff ?? null);
  }

  async isIpAllowedForExam(examId: string, clientIp: string | null) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId }, select: { id: true, mode: true, settings: true } });
    if (!exam) return { allowed: false, reason: 'exam_not_found' };
    if (!exam.mode || exam.mode === 'NORMAL') return { allowed: true };

    // LAB mode: check whitelist table first
    const entries = await this.prisma.examIpWhitelist.findMany({ where: { examId } });
    const rules = entries.map((e) => e.rule);
    if (rules.length === 0) {
      // fallback to legacy settings.allowedIpCidrs if present
      const allowedFromSettings = Array.isArray((exam.settings || {})?.allowedIpCidrs)
        ? (exam.settings || {})?.allowedIpCidrs
        : [];
      if (!allowedFromSettings || allowedFromSettings.length === 0) {
        return { allowed: false, reason: 'no_whitelist' };
      }
      if (isIpInAnyCidr(clientIp, allowedFromSettings)) return { allowed: true };
      return { allowed: false, reason: 'outside_allowed_cidrs' };
    }

    if (isIpInAnyCidr(clientIp, rules)) return { allowed: true };
    return { allowed: false, reason: 'outside_allowed_cidrs' };
  }

  async logDeniedAccess(examId: string, data: {
    studentId?: string | null;
    resolvedClientIp?: string | null;
    remoteIp?: string | null;
    forwardedFor?: string | null;
    userAgent?: string | null;
    reasonCode?: string | null;
    reasonMessage?: string | null;
    route?: string | null;
  }) {
    try {
      await this.prisma.examAccessDeniedLog.create({
        data: {
          examId,
          studentId: data.studentId || null,
          resolvedClientIp: data.resolvedClientIp || (data.remoteIp ?? null) || '',
          remoteIp: data.remoteIp || null,
          forwardedFor: data.forwardedFor || null,
          userAgent: data.userAgent || null,
          reasonCode: data.reasonCode || 'DENIED',
          reasonMessage: data.reasonMessage || null,
          route: data.route || null,
        },
      });
    } catch (err) {
      this.logger.warn('Failed to persist exam access denied log: ' + String(err));
    }
  }
}
