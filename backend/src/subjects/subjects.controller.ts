import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MANAGE_CURRICULUM_ROLES } from '../auth/access.constants.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { CreateSubjectDto } from './dto/create-subject.dto.js';
import { ListSubjectsQueryDto } from './dto/list-subjects-query.dto.js';
import { SubjectsService } from './subjects.service.js';

@Controller('subjects')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_CURRICULUM_ROLES)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  create(
    @CurrentInstituteId() instituteId: string,
    @Body() dto: CreateSubjectDto,
  ) {
    return this.subjectsService.create(instituteId, dto);
  }

  @Get()
  findAll(
    @CurrentInstituteId() instituteId: string,
    @Query('courseId') courseId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.subjectsService.findAllForCourse(instituteId, courseId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 10);
  }
}
