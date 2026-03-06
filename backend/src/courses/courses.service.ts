import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { PaginationDto, buildPaginatedResult } from '../common/dto/pagination.dto';

@Injectable()
export class CoursesService {
  constructor(private prisma: PrismaService) {}

  async create(createCourseDto: CreateCourseDto, lecturerId: string) {
    const existingCourse = await this.prisma.course.findUnique({
      where: { code: createCourseDto.code },
    });

    if (existingCourse) {
      throw new ConflictException('Course code already exists');
    }

    return this.prisma.course.create({
      data: {
        ...createCourseDto,
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

  async findOne(id: string) {
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

    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (updateCourseDto.code && updateCourseDto.code !== course.code) {
      const existingCourse = await this.prisma.course.findUnique({
        where: { code: updateCourseDto.code },
      });
      if (existingCourse) {
        throw new ConflictException('Course code already exists');
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: updateCourseDto,
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

  async remove(id: string) {
    const course = await this.prisma.course.findUnique({ where: { id } });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    await this.prisma.course.delete({ where: { id } });

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
