import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';
import { NotificationsService } from '../notifications/notifications.service';

interface AuthUser {
  id: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
}

@Injectable()
export class CoursesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  private async assertLecturerExists(lecturerId: string) {
    const lecturer = await this.prisma.user.findUnique({
      where: { id: lecturerId },
      select: { id: true, role: true, status: true },
    });

    if (!lecturer || lecturer.role !== 'LECTURER' || lecturer.status !== 'active') {
      throw new BadRequestException('Assigned lecturer is invalid or inactive');
    }
  }

  private async assertCanAccessCourse(courseId: string, courseLecturerId: string | null, user: AuthUser) {
    if (user.role === 'ADMIN') return;

    if (user.role === 'LECTURER') {
      if (courseLecturerId !== user.id) {
        throw new ForbiddenException('You are not allowed to access this course');
      }
      return;
    }

    if (user.role === 'STUDENT') {
      const isEnrolled = await this.prisma.enrollment.findFirst({
        where: {
          studentId: user.id,
          courseId,
        },
      });

      if (!isEnrolled) {
        throw new ForbiddenException('You are not allowed to access this course');
      }
      return;
    }

    throw new ForbiddenException('You are not allowed to access this course');
  }

  private toAsciiUpper(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .toUpperCase();
  }

  private buildToken(value: string, maxLength: number, fallback: string) {
    const compact = this.toAsciiUpper(value)
      .split(/\s+/)
      .filter(Boolean)
      .join('');

    return (compact.slice(0, maxLength) || fallback).toUpperCase();
  }

  private async generateCourseCode(courseName: string, creatorId: string) {
    const creator = await this.prisma.user.findUnique({
      where: { id: creatorId },
      select: { fullName: true, email: true },
    });

    const courseToken = this.buildToken(courseName, 6, 'COURSE');
    const creatorToken = this.buildToken(
      creator?.fullName || creator?.email?.split('@')[0] || '',
      4,
      'USER',
    );

    const base = `${courseToken}-${creatorToken}`;

    const existingCodes = await this.prisma.course.findMany({
      where: { code: { startsWith: `${base}-` } },
      select: { code: true },
    });

    const usedNumbers = new Set<number>();

    for (const item of existingCodes) {
      const suffix = item.code.slice(base.length + 1);
      const parsed = Number.parseInt(suffix, 10);
      if (!Number.isNaN(parsed)) {
        usedNumbers.add(parsed);
      }
    }

    let sequence = 1;
    while (usedNumbers.has(sequence)) {
      sequence += 1;
    }

    return `${base}-${String(sequence).padStart(2, '0')}`;
  }

  async create(createCourseDto: CreateCourseDto, user: AuthUser) {
    const { lecturerId: requestedLecturerId, ...courseData } = createCourseDto;
    const lecturerId = user.role === 'ADMIN' ? requestedLecturerId ?? null : user.id;
    const generatedCode = await this.generateCourseCode(createCourseDto.name, user.id);

    if (lecturerId) {
      await this.assertLecturerExists(lecturerId);
    }

    const createdCourse = await this.prisma.course.create({
      data: {
        ...courseData,
        code: generatedCode,
        lecturerId,
      },
      include: {
        lecturer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    try {
      const inputs: any[] = [];

      if (createdCourse.lecturer?.id) {
        inputs.push({
          recipientId: createdCourse.lecturer.id,
          kind: 'COURSE_ASSIGNED',
          title: 'Course assigned',
          message: `You are assigned to ${createdCourse.code} - ${createdCourse.name}.`,
          link: '/lecturer/courses',
          priority: 'normal',
          metadata: { courseId: createdCourse.id },
        });
      }

      if (user.role === 'LECTURER') {
        inputs.push({
          recipientId: user.id,
          kind: 'COURSE_CREATED',
          title: 'Course created',
          message: `Your course ${createdCourse.code} - ${createdCourse.name} was created successfully.`,
          link: '/lecturer/courses',
          priority: 'low',
          metadata: { courseId: createdCourse.id },
        });
      }

      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN', status: { not: 'deleted' } },
        select: { id: true },
      });

      admins.forEach((admin) => {
        if (admin.id !== user.id) {
          inputs.push({
            recipientId: admin.id,
            kind: 'COURSE_CREATED',
            title: 'New course created',
            message: `${createdCourse.code} - ${createdCourse.name} has been created.`,
            link: '/admin/courses',
            priority: 'low',
            metadata: { courseId: createdCourse.id, createdBy: user.id },
          });
        }
      });

      await this.notificationsService.createMany(inputs);
    } catch {
      // Notification failures must not block course creation.
    }

    return createdCourse;
  }

  async findAll(lecturerId?: string, pagination?: PaginationDto) {
    const where = lecturerId ? { lecturerId } : undefined;
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 20;

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          lecturer: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          _count: {
            select: {
              enrollments: true,
              exams: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return buildPaginatedResult(courses, total, page, limit);
  }

  async findOne(id: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        lecturer: {
          select: {
            id: true,
            fullName: true,
            email: true,
            department: true,
          },
        },
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                fullName: true,
                email: true,
                studentId: true,
              },
            },
          },
        },
        exams: {
          select: {
            id: true,
            title: true,
            status: true,
            startTime: true,
            endTime: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.assertCanAccessCourse(course.id, course.lecturerId, user);

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.assertCanAccessCourse(course.id, course.lecturerId, user);

    const { lecturerId: requestedLecturerId, ...courseData } = updateCourseDto;

    if (requestedLecturerId !== undefined && user.role !== 'ADMIN') {
      throw new ForbiddenException('Only admin can re-assign course lecturer');
    }

    if (requestedLecturerId) {
      await this.assertLecturerExists(requestedLecturerId);
    }

    const data: UpdateCourseDto = {
      ...courseData,
      ...(user.role === 'ADMIN' && requestedLecturerId !== undefined ? { lecturerId: requestedLecturerId } : {}),
    };

    const updatedCourse = await this.prisma.course.update({
      where: { id },
      data,
      include: {
        lecturer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    try {
      const enrollments = await this.prisma.enrollment.findMany({
        where: { courseId: id },
        select: { studentId: true },
      });

      const recipientIds = Array.from(
        new Set([
          ...enrollments.map((e) => e.studentId),
          ...(updatedCourse.lecturer?.id ? [updatedCourse.lecturer.id] : []),
        ]),
      );

      await this.notificationsService.createForUsers(recipientIds, {
        kind: 'COURSE_UPDATED',
        title: 'Course updated',
        message: `${updatedCourse.code} - ${updatedCourse.name} has new updates.`,
        link:
          user.role === 'ADMIN'
            ? '/admin/courses'
            : `/lecturer/course/${updatedCourse.id}`,
        priority: 'normal',
        metadata: { courseId: updatedCourse.id },
      });

      if (user.role !== 'ADMIN') {
        await this.notificationsService.createForRole('ADMIN', {
          kind: 'COURSE_UPDATED',
          title: 'Course modified',
          message: `${updatedCourse.code} - ${updatedCourse.name} was updated by lecturer.`,
          link: '/admin/courses',
          priority: 'low',
          metadata: { courseId: updatedCourse.id, updatedBy: user.id },
        });
      }
    } catch {
      // Notification failures must not block course updates.
    }

    return updatedCourse;
  }

  async remove(id: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.assertCanAccessCourse(course.id, course.lecturerId, user);

    const impactedEnrollments = await this.prisma.enrollment.findMany({
      where: { courseId: id },
      select: { studentId: true },
    });

    const impactedUserIds = Array.from(
      new Set([
        ...impactedEnrollments.map((e) => e.studentId),
        ...(course.lecturerId ? [course.lecturerId] : []),
      ]),
    );

    try {
      await this.prisma.course.delete({ where: { id } });
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ConflictException('Cannot delete course because it still has related data');
      }
      throw error;
    }

    try {
      await this.notificationsService.createForUsers(impactedUserIds, {
        kind: 'COURSE_DELETED',
        title: 'Course removed',
        message: `Course ${course.code} - ${course.name} has been removed from the system.`,
        link: user.role === 'ADMIN' ? '/admin/courses' : '/lecturer/courses',
        priority: 'high',
        metadata: { courseId: course.id },
      });
    } catch {
      // Notification failures must not block course deletion.
    }

    return { message: 'Course deleted successfully' };
  }

  async getMyCoursesAsStudent(studentId: string, limit?: number) {
    const courses = await this.prisma.course.findMany({
      where: {
        enrollments: {
          some: { studentId },
        },
      },
      include: {
        lecturer: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit, // Limit the number of courses if the limit is provided
    });

    // For each course compute counts and student progress
    const results = await Promise.all(
      courses.map(async (c) => {
        const [enrolledCount, publishedExamsCount, studentSubmittedCount, lastSubmission] = await Promise.all([
          this.prisma.enrollment.count({ where: { courseId: c.id } }),
          this.prisma.exam.count({ where: { courseId: c.id, status: 'PUBLISHED' } }),
          this.prisma.examSubmission.count({
            where: {
              studentId,
              exam: { courseId: c.id, status: 'PUBLISHED' },
              status: { in: ['SUBMITTED', 'GRADED'] },
            },
          }),
          this.prisma.examSubmission.findFirst({
            where: { studentId, exam: { courseId: c.id } },
            orderBy: { submittedAt: 'desc' },
            select: { submittedAt: true, startedAt: true, createdAt: true },
          }),
        ]);

        const progress = publishedExamsCount > 0 ? Math.round((studentSubmittedCount / publishedExamsCount) * 100) : 0;

        const lastAccessed = lastSubmission ? lastSubmission.submittedAt ?? lastSubmission.startedAt ?? lastSubmission.createdAt : null;

        return {
          id: c.id,
          code: c.code,
          name: c.name,
          academicYear: c.academicYear,
          term: c.term,
          description: c.description,
          credits: c.credits,
          lecturer: c.lecturer,
          enrolledStudents: enrolledCount,
          totalStudents: enrolledCount,
          progress,
          lastAccessed,
        };
      }),
    );

    return results;
  }

  async getMyCoursesAsLecturer(lecturerId: string) {
    const courses = await this.prisma.course.findMany({
      where: { lecturerId },
      orderBy: { createdAt: 'desc' },
    });

    const results = await Promise.all(
      courses.map(async (c) => {
        const [enrolledCount, publishedExamsCount, totalSubmissions, lastSubmission] = await Promise.all([
          this.prisma.enrollment.count({ where: { courseId: c.id } }),
          this.prisma.exam.count({ where: { courseId: c.id, status: 'PUBLISHED' } }),
          this.prisma.examSubmission.count({ where: { exam: { courseId: c.id, status: 'PUBLISHED' } } }),
          this.prisma.examSubmission.findFirst({
            where: { exam: { courseId: c.id } },
            orderBy: { submittedAt: 'desc' },
            select: { submittedAt: true, startedAt: true, createdAt: true },
          }),
        ]);

        const progress = publishedExamsCount > 0 && enrolledCount > 0
          ? Math.round((totalSubmissions / (publishedExamsCount * Math.max(1, enrolledCount))) * 100)
          : 0;

        const lastAccessed = lastSubmission ? lastSubmission.submittedAt ?? lastSubmission.startedAt ?? lastSubmission.createdAt : null;

        return {
          id: c.id,
          code: c.code,
          name: c.name,
          academicYear: c.academicYear,
          term: c.term,
          description: c.description,
          credits: c.credits,
          lecturerId: c.lecturerId,
          enrolledStudents: enrolledCount,
          totalStudents: enrolledCount,
          progress,
          lastAccessed,
        };
      }),
    );

    return results;
  }
}
