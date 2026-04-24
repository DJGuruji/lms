import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ROLE_STUDENT } from '../auth/constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { ContentService } from './content.service.js';

@Controller('student/contents')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(ROLE_STUDENT)
export class StudentContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  list(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: JwtUser,
    @Query('subjectId') subjectId: string | undefined,
  ) {
    if (!subjectId) {
      throw new BadRequestException('subjectId query parameter is required');
    }
    return this.contentService.listBySubjectForStudent(
      instituteId,
      user.id,
      subjectId,
    );
  }

  @Get('categories')
  listCategories(
    @CurrentInstituteId() instituteId: string,
    @Query('subjectId') subjectId: string,
  ) {
    if (!subjectId) {
      throw new BadRequestException('subjectId query parameter is required');
    }
    // Any student enrolled in the tenant can see the categories of a subject, 
    // but actual content enforces enrollment. We can safely list strictly tenant-scoped categories.
    return this.contentService.listCategories(instituteId, subjectId);
  }

  @Post('view')
  view(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: JwtUser,
    @Query('contentId') contentId: string | undefined,
  ) {
    if (!contentId) {
      throw new BadRequestException('contentId query parameter is required');
    }
    return this.contentService.recordViewForStudent(
      instituteId,
      user.id,
      contentId,
    );
  }
}
