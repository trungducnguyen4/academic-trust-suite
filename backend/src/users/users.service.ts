import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const createdUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        status: createUserDto.status || 'active',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      await this.notificationsService.createMany([
        {
          recipientId: createdUser.id,
          kind: 'ACCOUNT_CREATED',
          title: 'Account created',
          message: 'Your account is ready. Please review your profile and start using the system.',
          link: '/profile',
          priority: 'normal',
          metadata: { userId: createdUser.id, role: createdUser.role },
        },
      ]);

      await this.notificationsService.createForRole('ADMIN', {
        kind: 'USER_CREATED',
        title: 'New user created',
        message: `${createdUser.fullName} (${createdUser.role}) has been created.`,
        link: '/admin/users',
        priority: 'low',
        metadata: { userId: createdUser.id, role: createdUser.role },
      });
    } catch {
      // Notification failures must not block user creation.
    }

    return createdUser;
  }

  async findAll(role?: string, status?: string, search?: string, pagination?: PaginationDto) {
    const where: any = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    } else {
      where.status = { not: 'deleted' };
    }

    if (search) {
      where.OR = [
        { fullName: { contains: search } },
        { email: { contains: search } },
        { studentId: { contains: search } },
        { department: { contains: search } },
      ];
    }

    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          studentId: true,
          department: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResult(users, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        enrollments: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (emailInUse) {
        throw new ConflictException('Email already exists');
      }
    }

    const data: any = { ...updateUserDto };

    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        department: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    try {
      await this.notificationsService.create({
        recipientId: updatedUser.id,
        kind: 'ACCOUNT_UPDATED',
        title: 'Account updated',
        message: 'Your account profile or access settings were updated.',
        link: '/profile',
        priority: 'normal',
        metadata: {
          userId: updatedUser.id,
          roleChanged: user.role !== updatedUser.role,
          statusChanged: user.status !== updatedUser.status,
        },
      });

      if (user.role !== updatedUser.role || user.status !== updatedUser.status) {
        await this.notificationsService.createForRole('ADMIN', {
          kind: 'USER_ACCESS_UPDATED',
          title: 'User role/status changed',
          message: `${updatedUser.fullName}: ${user.role} -> ${updatedUser.role}, status ${user.status} -> ${updatedUser.status}.`,
          link: '/admin/users',
          priority: 'high',
          metadata: { userId: updatedUser.id },
        });
      }
    } catch {
      // Notification failures must not block user update.
    }

    return updatedUser;
  }

  async remove(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: { status: 'deleted' },
    });

    try {
      await this.notificationsService.createForRole('ADMIN', {
        kind: 'USER_ARCHIVED',
        title: 'User archived',
        message: `${user.fullName} has been archived.`,
        link: '/admin/users',
        priority: 'high',
        metadata: { userId: user.id },
      });
    } catch {
      // Notification failures must not block user archival.
    }

    return { message: 'User archived successfully' };
  }

  async getStudents() {
    return this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        status: { not: 'deleted' },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        studentId: true,
        department: true,
        status: true,
      },
    });
  }

  async getLecturers() {
    return this.prisma.user.findMany({
      where: {
        role: 'LECTURER',
        status: { not: 'deleted' },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        department: true,
        status: true,
      },
    });
  }
}
