import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { MANAGE_CURRICULUM_ROLES } from '../auth/access.constants.js';
import { TimeTableService } from './time-table.service.js';
import { SaveTimeTableDto } from './dto/save-time-table.dto.js';

@Controller('admin/courses/:courseId/time-table')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_CURRICULUM_ROLES)
export class AdminTimeTableController {
  constructor(private readonly timeTableService: TimeTableService) {}

  @Get()
  getTimeTable(@Param('courseId') courseId: string) {
    return this.timeTableService.getTimeTable(courseId);
  }

  @Post()
  saveTimeTable(
    @Param('courseId') courseId: string,
    @Body() dto: SaveTimeTableDto,
  ) {
    return this.timeTableService.saveTimeTable(courseId, dto);
  }
}
