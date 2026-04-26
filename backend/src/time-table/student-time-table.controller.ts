import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TimeTableService } from './time-table.service.js';

@Controller('student/courses/:courseId/time-table')
@UseGuards(JwtAuthGuard)
export class StudentTimeTableController {
  constructor(private readonly timeTableService: TimeTableService) {}

  @Get()
  getTimeTable(@Param('courseId') courseId: string) {
    return this.timeTableService.getTimeTable(courseId);
  }
}
