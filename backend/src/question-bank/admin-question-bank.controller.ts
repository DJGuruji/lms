import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { MANAGE_CURRICULUM_ROLES } from '../auth/access.constants.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { QuestionBankService } from './question-bank.service.js';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { CreateItemDto } from './dto/create-item.dto.js';
import { UpdateItemDto } from './dto/update-item.dto.js';

@Controller('subjects/:subjectId/question-bank')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_CURRICULUM_ROLES)
export class AdminQuestionBankController {
  constructor(private readonly qbService: QuestionBankService) {}

  // ── Upload ────────────────────────────────────────────────────────────────
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadFile(
    @CurrentInstituteId() instituteId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.qbService.uploadFile(instituteId, file);
  }

  // ── Folders ───────────────────────────────────────────────────────────────
  @Post('folders')
  createFolder(
    @CurrentInstituteId() instituteId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateFolderDto,
  ) {
    return this.qbService.createFolder(instituteId, subjectId, dto);
  }

  @Get('folders')
  listFolders(
    @CurrentInstituteId() instituteId: string,
    @Param('subjectId') subjectId: string,
  ) {
    return this.qbService.listFolders(instituteId, subjectId);
  }

  @Patch('folders/:folderId')
  renameFolder(
    @CurrentInstituteId() instituteId: string,
    @Param('folderId') folderId: string,
    @Body('name') name: string,
  ) {
    return this.qbService.renameFolder(instituteId, folderId, name);
  }

  @Delete('folders/:folderId')
  deleteFolder(
    @CurrentInstituteId() instituteId: string,
    @Param('folderId') folderId: string,
  ) {
    return this.qbService.deleteFolder(instituteId, folderId);
  }

  // ── Items ─────────────────────────────────────────────────────────────────
  @Post('folders/:folderId/items')
  createItem(
    @CurrentInstituteId() instituteId: string,
    @Param('folderId') folderId: string,
    @Body() dto: CreateItemDto & { fileUrl: string },
  ) {
    if (!dto.fileUrl) throw new BadRequestException('fileUrl is required');
    return this.qbService.createItem(instituteId, folderId, dto, dto.fileUrl);
  }

  @Get('folders/:folderId/items')
  listItems(
    @CurrentInstituteId() instituteId: string,
    @Param('folderId') folderId: string,
    @Query('page') page?: string,
  ) {
    return this.qbService.listItems(instituteId, folderId, page ? parseInt(page, 10) : 1);
  }

  @Patch('items/:itemId')
  updateItem(
    @CurrentInstituteId() instituteId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.qbService.updateItem(instituteId, itemId, dto);
  }

  @Delete('items/:itemId')
  deleteItem(
    @CurrentInstituteId() instituteId: string,
    @Param('itemId') itemId: string,
  ) {
    return this.qbService.deleteItem(instituteId, itemId);
  }
}
