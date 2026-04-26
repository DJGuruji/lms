import { Controller, Get, Post, Query, UseGuards, Request } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Controller('calendar')
@UseGuards(JwtAuthGuard)
export class StudentCalendarController {
  constructor(private calendarService: CalendarService) {}

  @Get()
  list(@Request() req, @Query('month') month: string) {
    return this.calendarService.listEventsForUser(req.user.instituteId, req.user.role, month);
  }

  @Get('notifications')
  getNotifications(@Request() req) {
    return this.calendarService.getNotificationCount(req.user.id, req.user.instituteId, req.user.role);
  }

  @Post('viewed')
  markViewed(@Request() req) {
    return this.calendarService.markCalendarViewed(req.user.id);
  }
}
