import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3StorageService } from '../storage/s3-storage.service.js';
import { SubjectsService } from '../subjects/subjects.service.js';
import { type UploadContentDto } from './dto/upload-content.dto.js';

const PDF_MIME = 'application/pdf';

function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}

function assertMimeMatchesType(
  mime: string,
  type: string,
): void {
  const normalized = type.toLowerCase();
  if (normalized === 'pdf' && mime !== PDF_MIME) {
    throw new UnsupportedMediaTypeException('PDF content requires a PDF file');
  }
  if (normalized === 'video' && !isVideoMime(mime)) {
    throw new UnsupportedMediaTypeException('Video content requires a video file');
  }
  if (normalized === 'audio' && !mime.startsWith('audio/')) {
    throw new UnsupportedMediaTypeException('Audio content requires an audio file');
  }
  if (normalized === 'image' && !mime.startsWith('image/')) {
    throw new UnsupportedMediaTypeException('Image content requires an image file');
  }
}

function safeFilename(original: string | undefined): string {
  const base = (original ?? 'file').split(/[/\\]/).pop() ?? 'file';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
}

@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly subjectsService: SubjectsService,
    private readonly storage: S3StorageService,
  ) {}

  async listBySubject(instituteId: string, subjectId: string, page = 1, limit = 10) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      this.prisma.content.findMany({
        where: { subjectId },
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          fileUrl: true,
          subjectId: true,
          categoryId: true,
        },
        orderBy: { title: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.content.count({ where: { subjectId } }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Same as listBySubject but requires enrollment in the subject's course (student). */
  async listBySubjectForStudent(
    instituteId: string,
    studentId: string,
    subjectId: string,
    page = 1,
    limit = 10,
  ) {
    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        course: { instituteId },
      },
      select: { courseId: true },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, courseId: subject.courseId },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in this course');
    }
    return this.listBySubject(instituteId, subjectId, page, limit);
  }

  async upload(
    instituteId: string,
    dto: UploadContentDto,
    file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }

    const t = dto.type.toLowerCase();
    if (t === 'video' && file.size > 50 * 1024 * 1024) throw new BadRequestException('Video cannot exceed 50 MB');
    if (t === 'pdf' && file.size > 25 * 1024 * 1024) throw new BadRequestException('PDF cannot exceed 25 MB');
    if (t === 'audio' && file.size > 25 * 1024 * 1024) throw new BadRequestException('Audio cannot exceed 25 MB');
    if (t === 'image' && file.size > 10 * 1024 * 1024) throw new BadRequestException('Image cannot exceed 10 MB');

    const mime = file.mimetype || 'application/octet-stream';
    assertMimeMatchesType(mime, dto.type);

    await this.subjectsService.ensureSubjectInTenant(dto.subjectId, instituteId);

    const segment =
      dto.type.toLowerCase().trim().replace(/[^a-z0-9]/g, '_') || 'other';
    const key = [
      'content',
      instituteId,
      dto.subjectId,
      segment,
      `${randomUUID()}-${safeFilename(file.originalname)}`,
    ].join('/');

    await this.storage.putObject(key, file.buffer, mime);

    const fileUrl = this.storage.publicUrlForKey(key);

    return this.prisma.content.create({
      data: {
        title: dto.title.trim(),
        description: dto.description?.trim(),
        type: dto.type,
        fileUrl,
        subjectId: dto.subjectId,
        categoryId: dto.categoryId,
      },
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        fileUrl: true,
        subjectId: true,
        categoryId: true,
      },
    });
  }

  async createCategory(instituteId: string, dto: { name: string; description?: string; subjectId: string }) {
    await this.subjectsService.ensureSubjectInTenant(dto.subjectId, instituteId);
    return this.prisma.contentCategory.create({
      data: {
        name: dto.name.trim(),
        description: dto.description?.trim(),
        subjectId: dto.subjectId,
      },
      select: { id: true, name: true, description: true, subjectId: true },
    });
  }

  async listCategories(instituteId: string, subjectId: string) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);
    return this.prisma.contentCategory.findMany({
      where: { subjectId },
      select: { id: true, name: true, description: true, subjectId: true },
      orderBy: { name: 'asc' },
    });
  }

  async deleteCategory(instituteId: string, id: string) {
    const cat = await this.prisma.contentCategory.findUnique({
      where: { id },
      select: { subjectId: true },
    });
    if (!cat) throw new NotFoundException('Category not found');
    await this.subjectsService.ensureSubjectInTenant(cat.subjectId, instituteId);
    await this.prisma.contentCategory.delete({ where: { id } });
    return { deleted: true };
  }

  async recordViewForStudent(
    instituteId: string,
    studentId: string,
    contentId: string,
  ) {
    const content = await this.prisma.content.findFirst({
      where: {
        id: contentId,
        subject: { course: { instituteId } },
      },
      select: { id: true, subject: { select: { courseId: true } } },
    });
    if (!content) {
      throw new NotFoundException('Content not found');
    }

    const enrollment = await this.prisma.enrollment.findFirst({
      where: {
        studentId,
        courseId: content.subject.courseId,
      },
      select: { id: true },
    });
    if (!enrollment) {
      throw new ForbiddenException('You must be enrolled in this course');
    }

    await this.prisma.contentView.create({
      data: {
        instituteId,
        studentId,
        contentId,
      },
      select: { id: true },
    });

    return { ok: true };
  }
}
