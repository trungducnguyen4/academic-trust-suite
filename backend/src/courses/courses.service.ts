import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';

interface AuthUser {
  id: string;
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';
}

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  private async assertLecturerExists(lecturerId: string) {
    const lecturer = await this.prisma.user.findUnique({
      where: { id: lecturerId },
      select: { id: true, role: true, status: true },
    });

    if (!lecturer || lecturer.role !== 'LECTURER' || lecturer.status !== 'active') {
      throw new BadRequestException('Assigned lecturer is invalid or inactive');
    }
  }

  private assertCanAccessCourse(courseLecturerId: string | null, user: AuthUser) {
    if (user.role === 'ADMIN') return;

    if (user.role !== 'LECTURER' || courseLecturerId !== user.id) {
      throw new ForbiddenException('You are not allowed to access this course');
    }
  }

  async create(createCourseDto: CreateCourseDto, user: AuthUser) {
    const existingCourse = await this.prisma.course.findUnique({
      where: { code: createCourseDto.code },
    });

    if (existingCourse) {
      throw new ConflictException('Course code already exists');
    }

    const { lecturerId: requestedLecturerId, ...courseData } = createCourseDto;
    const lecturerId = user.role === 'ADMIN' ? requestedLecturerId ?? null : user.id;

    if (lecturerId) {
      await this.assertLecturerExists(lecturerId);
    }

    return this.prisma.course.create({
      data: {
        ...courseData,
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

    this.assertCanAccessCourse(course.lecturerId, user);

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.assertCanAccessCourse(course.lecturerId, user);

    if (updateCourseDto.code && updateCourseDto.code !== course.code) {
      const existingCourse = await this.prisma.course.findUnique({
        where: { code: updateCourseDto.code },
      });
      if (existingCourse) {
        throw new ConflictException('Course code already exists');
      }
    }

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

    return this.prisma.course.update({
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
  }

  async remove(id: string, user: AuthUser) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.assertCanAccessCourse(course.lecturerId, user);

    try {
      await this.prisma.course.delete({ where: { id } });
    } catch (error: any) {
      if (error?.code === 'P2003') {
        throw new ConflictException('Cannot delete course because it still has related data');
      }
      throw error;
    }

    return { message: 'Course deleted successfully' };
  }

  async getMyCoursesAsStudent(studentId: string) {
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
          semester: c.semester,
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
          semester: c.semester,
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
