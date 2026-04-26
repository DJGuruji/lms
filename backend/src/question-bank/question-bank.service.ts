import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { S3StorageService } from '../storage/s3-storage.service.js';
import { SubjectsService } from '../subjects/subjects.service.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';

const ITEMS_PER_PAGE = 12;

@Injectable()
export class QuestionBankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: S3StorageService,
    private readonly subjectsService: SubjectsService,
  ) {}

  // ── File upload ─────────────────────────────────────────────────────────
  async uploadFile(instituteId: string, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file provided');
    const base = (file.originalname ?? 'file').split(/[/\\]/).pop() ?? 'file';
    const clean = base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180);
    const key = `tenants/${instituteId}/question-bank/${randomUUID()}_${clean}`;
    await this.storage.putObject(key, file.buffer, file.mimetype || 'application/octet-stream');
    return { fileUrl: this.storage.publicUrlForKey(key) };
  }

  // ── Folder CRUD ──────────────────────────────────────────────────────────
  async createFolder(instituteId: string, subjectId: string, dto: CreateFolderDto) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);
    return this.prisma.questionBankFolder.create({
      data: { name: dto.name.trim(), subjectId },
      include: { _count: { select: { items: true } } },
    });
  }

  async listFolders(instituteId: string, subjectId: string) {
    await this.subjectsService.ensureSubjectInTenant(subjectId, instituteId);
    return this.prisma.questionBankFolder.findMany({
      where: { subjectId },
      include: { _count: { select: { items: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async renameFolder(instituteId: string, folderId: string, name: string) {
    const folder = await this.prisma.questionBankFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.subjectsService.ensureSubjectInTenant(folder.subjectId, instituteId);
    return this.prisma.questionBankFolder.update({
      where: { id: folderId },
      data: { name: name.trim() },
    });
  }

  async deleteFolder(instituteId: string, folderId: string) {
    const folder = await this.prisma.questionBankFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.subjectsService.ensureSubjectInTenant(folder.subjectId, instituteId);
    await this.prisma.questionBankFolder.delete({ where: { id: folderId } });
    return { deleted: true };
  }

  // ── Item CRUD ────────────────────────────────────────────────────────────
  async createItem(
    instituteId: string,
    folderId: string,
    dto: CreateItemDto,
    fileUrl: string,
  ) {
    const folder = await this.prisma.questionBankFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.subjectsService.ensureSubjectInTenant(folder.subjectId, instituteId);
    return this.prisma.questionBankItem.create({
      data: {
        title: dto.title.trim(),
        fileUrl,
        fileType: dto.fileType,
        folderId,
      },
    });
  }

  async listItems(instituteId: string, folderId: string, page = 1) {
    const folder = await this.prisma.questionBankFolder.findUnique({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.subjectsService.ensureSubjectInTenant(folder.subjectId, instituteId);

    const skip = (page - 1) * ITEMS_PER_PAGE;
    const [data, total] = await Promise.all([
      this.prisma.questionBankItem.findMany({
        where: { folderId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: ITEMS_PER_PAGE,
      }),
      this.prisma.questionBankItem.count({ where: { folderId } }),
    ]);

    return { data, total, page, totalPages: Math.ceil(total / ITEMS_PER_PAGE) };
  }

  async updateItem(instituteId: string, itemId: string, dto: UpdateItemDto) {
    const item = await this.prisma.questionBankItem.findUnique({
      where: { id: itemId },
      include: { folder: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    await this.subjectsService.ensureSubjectInTenant(item.folder.subjectId, instituteId);
    return this.prisma.questionBankItem.update({
      where: { id: itemId },
      data: { ...(dto.title && { title: dto.title.trim() }) },
    });
  }

  async deleteItem(instituteId: string, itemId: string) {
    const item = await this.prisma.questionBankItem.findUnique({
      where: { id: itemId },
      include: { folder: true },
    });
    if (!item) throw new NotFoundException('Item not found');
    await this.subjectsService.ensureSubjectInTenant(item.folder.subjectId, instituteId);
    await this.prisma.questionBankItem.delete({ where: { id: itemId } });
    return { deleted: true };
  }

  // ── Student read ─────────────────────────────────────────────────────────
  async listFoldersForStudent(subjectId: string) {
    return this.prisma.questionBankFolder.findMany({
      where: { subjectId },
      include: {
        items: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, title: true, fileUrl: true, fileType: true, createdAt: true },
        },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
