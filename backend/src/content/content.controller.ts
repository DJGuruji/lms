import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MANAGE_CURRICULUM_ROLES } from '../auth/access.constants.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { ContentService } from './content.service.js';
import { UploadContentDto } from './dto/upload-content.dto.js';

/** Max upload size (single lesson file); tune via env later if needed. */
const MAX_BYTES = 512 * 1024 * 1024;

@Controller('contents')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_CURRICULUM_ROLES)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  /** List media for a subject (tenant-scoped). */
  @Get()
  list(
    @CurrentInstituteId() instituteId: string,
    @Query('subjectId') subjectId: string | undefined,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    if (!subjectId) {
      throw new BadRequestException('subjectId query parameter is required');
    }
    return this.contentService.listBySubject(instituteId, subjectId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 10);
  }

  @Post('categories')
  async createCategory(
    @CurrentInstituteId() instituteId: string,
    @Body() dto: { name: string; description?: string; subjectId: string },
  ) {
    if (!dto.subjectId || !dto.name) throw new BadRequestException('subjectId and name are required');
    return this.contentService.createCategory(instituteId, dto);
  }

  @Get('categories')
  async listCategories(
    @CurrentInstituteId() instituteId: string,
    @Query('subjectId') subjectId: string,
  ) {
    if (!subjectId) throw new BadRequestException('subjectId is required');
    return this.contentService.listCategories(instituteId, subjectId);
  }

  @Delete('categories/:id')
  async deleteCategory(
    @CurrentInstituteId() instituteId: string,
    @Param('id') id: string,
  ) {
    return this.contentService.deleteCategory(instituteId, id);
  }

  /**
   * Multipart: field `file` + form fields `title`, `subjectId`, `type` (`Video` | `PDF`).
   */
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_BYTES },
    }),
  )
  upload(
    @CurrentInstituteId() instituteId: string,
    @Body() dto: UploadContentDto,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (file && file.size > MAX_BYTES) {
      throw new BadRequestException('File too large');
    }
    return this.contentService.upload(instituteId, dto, file);
  }
}
