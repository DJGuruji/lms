import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { ROLE_STUDENT } from '../auth/constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CoursesService } from '../courses/courses.service.js';
import type { EnrollDto } from './dto/enroll.dto.js';

@Injectable()
export class EnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  async enroll(instituteId: string, dto: EnrollDto) {
    await this.coursesService.ensureCourseInTenant(dto.courseId, instituteId);
    if (dto.subjectId) {
      const ok = await this.prisma.subject.findFirst({
        where: {
          id: dto.subjectId,
          courseId: dto.courseId,
          course: { instituteId },
        },
        select: { id: true },
      });
      if (!ok) {
        throw new BadRequestException('subjectId must belong to the course');
      }
    }

    const student = await this.prisma.user.findFirst({
      where: {
        id: dto.studentId,
        instituteId,
        role: ROLE_STUDENT,
      },
      select: { id: true },
    });
    if (!student) {
      throw new BadRequestException(
        'Student not found or user is not a student in this institute',
      );
    }

    try {
      return await this.prisma.enrollment.create({
        data: {
          studentId: dto.studentId,
          courseId: dto.courseId,
          ...(dto.subjectId ? { subjectId: dto.subjectId } : {}),
        },
        // Prisma client is regenerated after schema migrations; keep select minimal.
        select: {
          id: true,
          studentId: true,
          courseId: true,
        } as any,
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Student is already enrolled in this course');
      }
      throw err;
    }
  }
}
