import { Injectable } from '@nestjs/common';
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

  async findAllForCourse(instituteId: string, courseId: string) {
    await this.coursesService.ensureCourseInTenant(courseId, instituteId);
    return this.prisma.subject.findMany({
      where: { courseId },
      select: subjectSelect,
      orderBy: { name: 'asc' },
    });
  }
}
