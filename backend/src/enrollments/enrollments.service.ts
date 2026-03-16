import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto, BulkEnrollmentDto, BulkEnrollByEmailsDto, UpdateEnrollmentStatusDto } from './dto/enrollment.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);
  constructor(private prisma: PrismaService) {}

  async create(createEnrollmentDto: CreateEnrollmentDto) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createEnrollmentDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if student exists and is a student
    const student = await this.prisma.user.findUnique({
      where: { id: createEnrollmentDto.studentId },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    if (student.role !== 'STUDENT') {
      throw new BadRequestException('User is not a student');
    }

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: createEnrollmentDto.studentId,
          courseId: createEnrollmentDto.courseId,
        },
      },
    });

    if (existingEnrollment) {
      throw new ConflictException('Student already enrolled in this course');
    }

    return this.prisma.enrollment.create({
      data: createEnrollmentDto,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentId: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async bulkEnroll(bulkEnrollmentDto: BulkEnrollmentDto) {
    const { courseId, studentIds } = bulkEnrollmentDto;

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const results = {
      success: [] as string[],
      failed: [] as { studentId: string; reason: string }[],
    };

    for (const studentId of studentIds) {
      try {
        const student = await this.prisma.user.findUnique({
          where: { id: studentId },
        });

        if (!student) {
          results.failed.push({ studentId, reason: 'Student not found' });
          continue;
        }

        if (student.role !== 'STUDENT') {
          results.failed.push({ studentId, reason: 'User is not a student' });
          continue;
        }

        const existingEnrollment = await this.prisma.enrollment.findUnique({
          where: {
            studentId_courseId: { studentId, courseId },
          },
        });

        if (existingEnrollment) {
          results.failed.push({ studentId, reason: 'Already enrolled' });
          continue;
        }

        await this.prisma.enrollment.create({
          data: { studentId, courseId },
        });

        results.success.push(studentId);
      } catch (error) {
        results.failed.push({ studentId, reason: 'Unknown error' });
      }
    }

    return results;
  }

  async bulkEnrollByEmails(dto: BulkEnrollByEmailsDto) {
    const { courseId, emails } = dto;

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    const results = {
      success: [] as { email: string; fullName: string; studentId: string | null }[],
      failed: [] as { email: string; reason: string }[],
      provisioned: 0,
    };

    for (const email of emails) {
      try {
        let student = await this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });

        // Auto-provision: create student account if email not yet registered
        if (!student) {
          const tempPassword = await bcrypt.hash('Examtrust@123', 10);
          const emailPrefix = email.split('@')[0];
          student = await this.prisma.user.create({
            data: {
              email: email.toLowerCase().trim(),
              password: tempPassword,
              fullName: emailPrefix,
              role: 'STUDENT',
            },
          });
          results.provisioned = (results.provisioned ?? 0) + 1;
        }

        if (student.role !== 'STUDENT') { results.failed.push({ email, reason: 'User is not a student (role: ' + student.role + ')' }); continue; }

        const existing = await this.prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId: student.id, courseId } },
        });
        if (existing) { results.failed.push({ email, reason: 'Already enrolled' }); continue; }

        await this.prisma.enrollment.create({ data: { studentId: student.id, courseId } });
        results.success.push({ email, fullName: student.fullName, studentId: student.studentId });
      } catch (err: any) {
        this.logger.error(`Failed to enroll ${email}: ${err?.message}`);
        results.failed.push({ email, reason: err?.message ?? 'Unknown error' });
      }
    }

    return results;
  }

  async findByCourse(courseId: string) {
    return this.prisma.enrollment.findMany({
      where: { courseId },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentId: true,
            department: true,
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async findByStudent(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: { studentId },
      include: {
        course: {
          include: {
            lecturer: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    });
  }

  async updateStatus(id: string, updateStatusDto: UpdateEnrollmentStatusDto) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.prisma.enrollment.update({
      where: { id },
      data: { status: updateStatusDto.status },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            email: true,
            studentId: true,
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    await this.prisma.enrollment.delete({ where: { id } });

    return { message: 'Enrollment removed successfully' };
  }

  async removeByStudentAndCourse(studentId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    await this.prisma.enrollment.delete({
      where: { id: enrollment.id },
    });

    return { message: 'Enrollment removed successfully' };
  }
}
