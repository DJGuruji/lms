import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3StorageService } from '../storage/s3-storage.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';
import { SubjectsService } from '../subjects/subjects.service.js';

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjectsService: SubjectsService,
    private readonly storage: S3StorageService,
  ) {}

  // --- File Upload ---
  async upload(instituteId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    
    // clean filename
    const base = (file.originalname ?? 'file').split(/[/\\]/).pop() ?? 'file';
    const cleanName = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const key = `tenants/${instituteId}/assignments/${randomUUID()}_${cleanName}`;
    
    await this.storage.putObject(key, file.buffer, file.mimetype || 'application/octet-stream');
    
    return {
      fileUrl: this.storage.publicUrlForKey(key),
    };
  }

  // --- Admin Methods ---

  async createSubjectAssignment(instituteId: string, subjectId: string, dto: CreateAssignmentDto) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);

    return this.prisma.assignment.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        subjectId,
        questions: {
          create: dto.questions.map((q) => ({
            text: q.text.trim(),
            imageUrl: q.imageUrl,
            pdfUrl: q.pdfUrl,
          })),
        },
      },
      include: {
        questions: true,
      },
    });
  }

  async listAssignmentsBySubject(instituteId: string, subjectId: string, page = 1, limit = 8) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);

    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.assignment.findMany({
        where: { subjectId },
        include: {
          questions: true,
          _count: { select: { submissions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.assignment.count({ where: { subjectId } }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async listSubmissionsForAssignment(instituteId: string, subjectId: string, assignmentId: string) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);

    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId, subjectId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');

    return this.prisma.assignmentSubmission.findMany({
      where: { assignmentId },
      include: {
        student: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async removeAssignment(instituteId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { subject: true },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.subjectsService.ensureSubjectInTenant(assignment.subjectId, instituteId);

    await this.prisma.assignment.delete({ where: { id: assignmentId } });
    return { deleted: true };
  }

  async updateAssignment(instituteId: string, assignmentId: string, dto: UpdateAssignmentDto) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.subjectsService.ensureSubjectInTenant(assignment.subjectId, instituteId);

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.description !== undefined && { description: dto.description?.trim() }),
        ...(dto.dueDate !== undefined && { dueDate: dto.dueDate ? new Date(dto.dueDate) : null }),
        ...(dto.isPublished !== undefined && { isPublished: dto.isPublished }),
        // If questions are supplied, replace them all
        ...(dto.questions !== undefined && {
          questions: {
            deleteMany: {},
            create: dto.questions.map((q) => ({
              text: q.text.trim(),
              imageUrl: q.imageUrl || null,
              pdfUrl: q.pdfUrl || null,
            })),
          },
        }),
      },
      include: { questions: true },
    });
  }

  async togglePublish(instituteId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.subjectsService.ensureSubjectInTenant(assignment.subjectId, instituteId);

    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { isPublished: !assignment.isPublished },
      select: { id: true, isPublished: true },
    });
  }

  // --- Student Methods ---

  async listAssignmentsForStudent(instituteId: string, studentId: string) {
    // A student is enrolled in courses. Assignments belong to subjects.
    // Return all assignments corresponding to subjects strictly inside their enrolled courses.
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, course: { instituteId } },
      select: { courseId: true },
    });
    
    const courseIds = enrollments.map((e) => e.courseId);
    
    return this.prisma.assignment.findMany({
      where: {
        isPublished: true,                           // ← hide unpublished from students
        subject: { courseId: { in: courseIds } },
      },
      include: {
        questions: true,
        subject: { select: { name: true, course: { select: { name: true } } } },
        submissions: {
          where: { studentId }, // Helps frontend know if this specific student submitted
          take: 1,
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async submitAssignment(instituteId: string, studentId: string, assignmentId: string, dto: SubmitAssignmentDto) {
    // Student must be enrolled in the course that contains this assignment's subject.
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: { subject: { select: { courseId: true } } },
    });

    if (!assignment) throw new NotFoundException('Assignment not found.');

    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, courseId: assignment.subject.courseId },
    });

    if (!enrollment) throw new ForbiddenException('Not enrolled in course.');

    // Upsert to handle resubmissions or ensure one submission per student per assignment.
    return this.prisma.assignmentSubmission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      update: {
        fileUrl: dto.fileUrl,
        submittedAt: new Date(),
      },
      create: {
        assignmentId,
        studentId,
        fileUrl: dto.fileUrl,
      },
    });
  }
}
