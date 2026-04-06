import { Injectable, NotFoundException, ConflictException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEnrollmentDto, BulkEnrollmentDto, BulkEnrollByEmailsDto, UpdateEnrollmentStatusDto } from './dto/enrollment.dto';
import * as bcrypt from 'bcrypt';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class EnrollmentsService {
  private readonly logger = new Logger(EnrollmentsService.name);

  private assertCanManageCourse(courseLecturerId: string | null, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    if (user.role === 'ADMIN') return;
    if (user.role !== 'LECTURER' || courseLecturerId !== user.id) {
      throw new ForbiddenException('You are not allowed to manage enrollments for this course');
    }
  }

  private async assertCanManageCourseById(courseId: string, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, lecturerId: true },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.assertCanManageCourse(course.lecturerId, user);
    return course;
  }

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createEnrollmentDto: CreateEnrollmentDto, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: createEnrollmentDto.courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.assertCanManageCourse(course.lecturerId, user);

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

    const enrollment = await this.prisma.enrollment.create({
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

    try {
      const inputs: any[] = [
        {
          recipientId: enrollment.student.id,
          kind: 'ENROLLMENT_CREATED',
          title: 'Enrollment confirmed',
          message: `You are enrolled in ${enrollment.course.code} - ${enrollment.course.name}.`,
          link: `/student/course/${enrollment.course.id}`,
          priority: 'normal',
          metadata: { courseId: enrollment.course.id, enrollmentId: enrollment.id },
        },
      ];

      if (course.lecturerId) {
        inputs.push({
          recipientId: course.lecturerId,
          kind: 'ENROLLMENT_CREATED',
          title: 'New student enrolled',
          message: `${enrollment.student.fullName} joined ${enrollment.course.code}.`,
          link: `/lecturer/course/${enrollment.course.id}`,
          priority: 'low',
          metadata: { courseId: enrollment.course.id, studentId: enrollment.student.id },
        });
      }

      await this.notificationsService.createMany(inputs);
    } catch {
      // Notification failures must not block enrollment creation.
    }

    return enrollment;
  }

  async bulkEnroll(bulkEnrollmentDto: BulkEnrollmentDto, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    const { courseId, studentIds } = bulkEnrollmentDto;

    // Check if course exists
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    this.assertCanManageCourse(course.lecturerId, user);

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

    try {
      if (results.success.length > 0) {
        await this.notificationsService.createForUsers(results.success, {
          kind: 'ENROLLMENT_CREATED',
          title: 'Enrollment confirmed',
          message: `You have been enrolled in ${course.code} - ${course.name}.`,
          link: `/student/course/${course.id}`,
          priority: 'normal',
          metadata: { courseId: course.id },
        });

        if (course.lecturerId) {
          await this.notificationsService.create({
            recipientId: course.lecturerId,
            kind: 'ENROLLMENT_BULK_CREATED',
            title: 'Bulk enrollment completed',
            message: `${results.success.length} student(s) were enrolled into ${course.code}.`,
            link: `/lecturer/course/${course.id}`,
            priority: 'normal',
            metadata: {
              courseId: course.id,
              successCount: results.success.length,
              failedCount: results.failed.length,
            },
          });
        }
      }
    } catch {
      // Notification failures must not block bulk enroll flow.
    }

    return results;
  }

  async bulkEnrollByEmails(dto: BulkEnrollByEmailsDto, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    const { courseId, emails } = dto;

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    this.assertCanManageCourse(course.lecturerId, user);

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

    try {
      const successEmails = new Set(results.success.map((s) => s.email.toLowerCase().trim()));
      if (successEmails.size > 0) {
        const successStudents = await this.prisma.user.findMany({
          where: {
            role: 'STUDENT',
            email: { in: Array.from(successEmails) },
          },
          select: { id: true },
        });

        await this.notificationsService.createForUsers(
          successStudents.map((s) => s.id),
          {
            kind: 'ENROLLMENT_CREATED',
            title: 'Enrollment confirmed',
            message: `You have been enrolled in ${course.code} - ${course.name}.`,
            link: `/student/course/${course.id}`,
            priority: 'normal',
            metadata: { courseId: course.id },
          },
        );
      }

      if (results.provisioned > 0) {
        await this.notificationsService.createForRole('ADMIN', {
          kind: 'USER_AUTO_PROVISIONED',
          title: 'Student accounts auto-provisioned',
          message: `${results.provisioned} new student account(s) were created during email enrollment.`,
          link: '/admin/users',
          priority: 'normal',
          metadata: { courseId: course.id, provisioned: results.provisioned },
        });
      }
    } catch {
      // Notification failures must not block bulk-by-email flow.
    }

    return results;
  }

  async findByCourse(courseId: string, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    await this.assertCanManageCourseById(courseId, user);

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

  async updateStatus(id: string, updateStatusDto: UpdateEnrollmentStatusDto, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: {
          select: {
            lecturerId: true,
          },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    this.assertCanManageCourse(enrollment.course.lecturerId, user);

    const updated = await this.prisma.enrollment.update({
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

    try {
      const course = await this.prisma.course.findUnique({
        where: { id: updated.course.id },
        select: { lecturerId: true },
      });

      const recipients = Array.from(
        new Set([
          updated.student.id,
          ...(course?.lecturerId ? [course.lecturerId] : []),
        ]),
      );

      await this.notificationsService.createForUsers(recipients, {
        kind: 'ENROLLMENT_STATUS_CHANGED',
        title: 'Enrollment status updated',
        message: `Enrollment status for ${updated.course.code} is now ${updated.status}.`,
        link: `/student/course/${updated.course.id}`,
        priority: 'normal',
        metadata: { enrollmentId: updated.id, status: updated.status },
      });
    } catch {
      // Notification failures must not block status update.
    }

    return updated;
  }

  async remove(id: string, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { id },
      include: {
        course: {
          select: { id: true, code: true, name: true, lecturerId: true },
        },
        student: {
          select: { id: true, fullName: true },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    this.assertCanManageCourse(enrollment.course.lecturerId, user);

    await this.prisma.enrollment.delete({ where: { id } });

    try {
      await this.notificationsService.createForUsers(
        [
          enrollment.student.id,
          ...(enrollment.course.lecturerId ? [enrollment.course.lecturerId] : []),
        ],
        {
          kind: 'ENROLLMENT_REMOVED',
          title: 'Enrollment removed',
          message: `${enrollment.student.fullName} is no longer enrolled in ${enrollment.course.code}.`,
          link: '/lecturer/courses',
          priority: 'high',
          metadata: { courseId: enrollment.course.id },
        },
      );
    } catch {
      // Notification failures must not block enrollment removal.
    }

    return { message: 'Enrollment removed successfully' };
  }

  async removeByStudentAndCourse(studentId: string, courseId: string, user: { id: string; role: 'ADMIN' | 'LECTURER' | 'STUDENT' }) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        studentId_courseId: { studentId, courseId },
      },
      include: {
        course: {
          select: { id: true, code: true, lecturerId: true },
        },
      },
    });

    if (!enrollment) {
      throw new NotFoundException('Enrollment not found');
    }

    this.assertCanManageCourse(enrollment.course.lecturerId, user);

    await this.prisma.enrollment.delete({
      where: { id: enrollment.id },
    });

    try {
      await this.notificationsService.createForUsers(
        [
          studentId,
          ...(enrollment.course.lecturerId ? [enrollment.course.lecturerId] : []),
        ],
        {
          kind: 'ENROLLMENT_REMOVED',
          title: 'Enrollment removed',
          message: `Enrollment in ${enrollment.course.code} has been removed.`,
          link: '/student',
          priority: 'high',
          metadata: { courseId: enrollment.course.id },
        },
      );
    } catch {
      // Notification failures must not block enrollment removal.
    }

    return { message: 'Enrollment removed successfully' };
  }
}
