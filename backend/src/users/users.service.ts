import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    return this.prisma.user.create({
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

    return this.prisma.user.update({
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
