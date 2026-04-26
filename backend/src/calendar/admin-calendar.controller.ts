import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { CreateCalendarEventDto } from './dto/create-event.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '@prisma/client';

@Controller('admin/calendar')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(Role.INSTITUTION_ADMIN, Role.TEACHER)
export class AdminCalendarController {
  constructor(private calendarService: CalendarService) {}

  @Post()
  create(@Request() req, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.createEvent(req.user.id, req.user.instituteId, dto);
  }

  @Get()
  list(@Request() req, @Query('month') month: string) {
    // Admins see everything, teachers see based on listEventsForUser logic usually but 
    // for management we might want them to see what they can edit.
    // Actually, listEventsForUser is better as it handles audience.
    return this.calendarService.listEventsForUser(req.user.instituteId, req.user.role, month);
  }

  @Patch(':id')
  update(@Request() req, @Param('id') id: string, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.updateEvent(req.user.id, req.user.role, req.user.instituteId, id, dto);
  }

  @Delete(':id')
  delete(@Request() req, @Param('id') id: string) {
    return this.calendarService.deleteEvent(req.user.id, req.user.role, req.user.instituteId, id);
  }
}
