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
import { CONTENT_TYPES, type UploadContentDto } from './dto/upload-content.dto.js';

const PDF_MIME = 'application/pdf';

function isVideoMime(mime: string): boolean {
  return mime.startsWith('video/');
}

function assertMimeMatchesType(
  mime: string,
  type: (typeof CONTENT_TYPES)[number],
): void {
  if (type === 'PDF' && mime !== PDF_MIME) {
    throw new UnsupportedMediaTypeException('PDF content type requires a PDF file');
  }
  if (type === 'Video' && !isVideoMime(mime)) {
    throw new UnsupportedMediaTypeException(
      'Video content type requires a video file',
    );
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

  async listBySubject(instituteId: string, subjectId: string) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);
    return this.prisma.content.findMany({
      where: { subjectId },
      select: {
        id: true,
        title: true,
        type: true,
        fileUrl: true,
        subjectId: true,
      },
      orderBy: { title: 'asc' },
    });
  }

  /** Same as listBySubject but requires enrollment in the subject's course (student). */
  async listBySubjectForStudent(
    instituteId: string,
    studentId: string,
    subjectId: string,
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
    return this.listBySubject(instituteId, subjectId);
  }

  async upload(
    instituteId: string,
    dto: UploadContentDto,
    file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File is required');
    }

    const mime = file.mimetype || 'application/octet-stream';
    assertMimeMatchesType(mime, dto.type);

    await this.subjectsService.ensureSubjectInTenant(dto.subjectId, instituteId);

    const segment =
      dto.type === 'PDF' ? 'pdf' : 'video';
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
        type: dto.type,
        fileUrl,
        subjectId: dto.subjectId,
      },
      select: {
        id: true,
        title: true,
        type: true,
        fileUrl: true,
        subjectId: true,
      },
    });
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
