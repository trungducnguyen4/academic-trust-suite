import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  PaginationDto,
  buildPaginatedResult,
} from "../common/dto/pagination.dto";

type NotificationPriority = "low" | "normal" | "high";

export interface CreateNotificationInput {
  recipientId: string;
  kind: string;
  title: string;
  message: string;
  link?: string | null;
  priority?: NotificationPriority;
  metadata?: Record<string, any> | null;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateNotificationInput) {
    return this.prisma.notification.create({
      data: {
        recipientId: input.recipientId,
        kind: input.kind,
        title: input.title,
        message: input.message,
        link: input.link ?? null,
        priority: input.priority ?? "normal",
        metadata: input.metadata ?? undefined,
      },
    });
  }

  async createMany(inputs: CreateNotificationInput[]) {
    if (inputs.length === 0) return [];

    return this.prisma.$transaction(
      inputs.map((input) =>
        this.prisma.notification.create({
          data: {
            recipientId: input.recipientId,
            kind: input.kind,
            title: input.title,
            message: input.message,
            link: input.link ?? null,
            priority: input.priority ?? "normal",
            metadata: input.metadata ?? undefined,
          },
        }),
      ),
    );
  }

  async createForRole(
    role: "ADMIN" | "LECTURER" | "STUDENT",
    input: Omit<CreateNotificationInput, "recipientId">,
  ) {
    const recipients = await this.prisma.user.findMany({
      where: { role, status: { not: "deleted" } },
      select: { id: true },
    });

    return this.createMany(
      recipients.map((recipient) => ({
        ...input,
        recipientId: recipient.id,
      })),
    );
  }

  async createForUsers(
    userIds: string[],
    input: Omit<CreateNotificationInput, "recipientId">,
  ) {
    if (userIds.length === 0) return [];

    const uniqueUserIds = Array.from(new Set(userIds));

    return this.createMany(
      uniqueUserIds.map((recipientId) => ({
        ...input,
        recipientId,
      })),
    );
  }

  async findMyNotifications(
    userId: string,
    pagination?: PaginationDto,
    unreadOnly = false,
  ) {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;
    const where = {
      recipientId: userId,
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return buildPaginatedResult(notifications, total, page, limit);
  }

  async getUnreadCount(userId: string) {
    return this.prisma.notification.count({
      where: {
        recipientId: userId,
        isRead: false,
      },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException("Not authorized");
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        isRead: true,
        readAt: notification.readAt ?? new Date(),
      },
    });
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        recipientId: userId,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return { message: "All notifications marked as read" };
  }

  async remove(id: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException("Notification not found");
    }

    if (notification.recipientId !== userId) {
      throw new ForbiddenException("Not authorized");
    }

    await this.prisma.notification.delete({ where: { id } });

    return { message: "Notification deleted successfully" };
  }
}
