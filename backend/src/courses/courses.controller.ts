import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { MANAGE_CURRICULUM_ROLES } from '../auth/access.constants.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

@Controller('courses')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_CURRICULUM_ROLES)
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Post()
  create(
    @CurrentInstituteId() instituteId: string,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coursesService.create(instituteId, dto);
  }

  @Get()
  findAll(@CurrentInstituteId() instituteId: string) {
    return this.coursesService.findAll(instituteId);
  }

  @Put(':id')
  update(
    @CurrentInstituteId() instituteId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(instituteId, id, dto);
  }

  @Delete(':id')
  remove(
    @CurrentInstituteId() instituteId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.coursesService.remove(instituteId, id);
  }
}
