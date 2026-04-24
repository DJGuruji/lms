import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CoursesService } from '../courses/courses.service.js';
import type { CreateSubjectDto } from './dto/create-subject.dto.js';

const subjectSelect = {
  id: true,
  name: true,
  courseId: true,
} as const;

@Injectable()
export class SubjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly coursesService: CoursesService,
  ) {}

  async create(instituteId: string, dto: CreateSubjectDto) {
    await this.coursesService.ensureCourseInTenant(dto.courseId, instituteId);
    return this.prisma.subject.create({
      data: {
        name: dto.name.trim(),
        courseId: dto.courseId,
      },
      select: subjectSelect,
    });
  }

  async findAllForCourse(instituteId: string, courseId: string, page = 1, limit = 10) {
    await this.coursesService.ensureCourseInTenant(courseId, instituteId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        where: { courseId },
        select: subjectSelect,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.subject.count({ where: { courseId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Ensures subject exists and belongs to a course in this institute (tenant). */
  async ensureSubjectInTenant(subjectId: string, instituteId: string) {
    const row = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        course: { instituteId },
      },
      select: { id: true },
    });
    if (!row) {
      throw new NotFoundException('Subject not found');
    }
  }
}
