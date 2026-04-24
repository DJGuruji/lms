import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { PrismaService } from '../prisma/prisma.service.js';
import { forInstitute } from '../tenant/tenant-scope.js';
import type { CreateCourseDto } from './dto/create-course.dto.js';
import type { UpdateCourseDto } from './dto/update-course.dto.js';

const courseSelect = {
  id: true,
  name: true,
  instituteId: true,
} as const;

@Injectable()
export class CoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(instituteId: string, dto: CreateCourseDto) {
    return this.prisma.course.create({
      data: {
        name: dto.name.trim(),
        instituteId,
      },
      select: courseSelect,
    });
  }

  async findAll(instituteId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.course.findMany({
        where: forInstitute(instituteId),
        select: courseSelect,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.course.count({ where: forInstitute(instituteId) }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async update(instituteId: string, courseId: string, dto: UpdateCourseDto) {
    await this.ensureCourseInTenant(courseId, instituteId);
    try {
      return await this.prisma.course.update({
        where: { id: courseId },
        data: { name: dto.name.trim() },
        select: courseSelect,
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('Course not found');
      }
      throw err;
    }
  }

  async remove(instituteId: string, courseId: string) {
    await this.ensureCourseInTenant(courseId, instituteId);
    await this.prisma.course.delete({
      where: { id: courseId },
    });
    return { deleted: true };
  }

  async ensureCourseInTenant(courseId: string, instituteId: string) {
    const c = await this.prisma.course.findFirst({
      where: { id: courseId, instituteId },
      select: { id: true },
    });
    if (!c) {
      throw new NotFoundException('Course not found');
    }
  }

  /** Enrolled courses with subjects — student dashboard (TASK step 16). */
  async findEnrolledWithSubjects(instituteId: string, studentId: string) {
    const rows = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        course: { instituteId },
      },
      include: {
        course: {
          select: {
            id: true,
            name: true,
            subjects: {
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            },
          },
        },
      },
      orderBy: { course: { name: 'asc' } },
    });

    return rows.map((e) => ({
      enrollmentId: e.id,
      course: e.course,
    }));
  }
}
