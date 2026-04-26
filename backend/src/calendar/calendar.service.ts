import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCalendarEventDto } from './dto/create-event.dto.js';
import { CalendarAudience, Role } from '@prisma/client';

@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async createEvent(userId: string, instituteId: string, dto: CreateCalendarEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        ...dto,
        date: new Date(dto.date),
        instituteId,
        createdById: userId,
      },
    });
  }

  async updateEvent(userId: string, role: Role, instituteId: string, eventId: string, dto: CreateCalendarEventDto) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.instituteId !== instituteId) throw new ForbiddenException();

    // Permissions check
    if (role !== Role.INSTITUTION_ADMIN && event.createdById !== userId) {
      throw new ForbiddenException('You can only edit your own events');
    }

    return this.prisma.calendarEvent.update({
      where: { id: eventId },
      data: {
        ...dto,
        date: new Date(dto.date),
      },
    });
  }

  async listEventsForAdmin(instituteId: string, month: string) {
    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

    return this.prisma.calendarEvent.findMany({
      where: {
        instituteId,
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        creator: { select: { id: true, name: true } }
      },
      orderBy: { date: 'asc' },
    });
  }

  async listEventsForUser(instituteId: string, role: Role, month: string) {
    const startOfMonth = new Date(`${month}-01`);
    const endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0);

    const audiences: CalendarAudience[] = [CalendarAudience.ALL];
    
    if (role === Role.INSTITUTION_ADMIN) {
      audiences.push(CalendarAudience.INSTITUTION_ADMIN, CalendarAudience.TEACHERS, CalendarAudience.STUDENTS);
    } else if (role === Role.TEACHER) {
      audiences.push(CalendarAudience.TEACHERS, CalendarAudience.STUDENTS);
    } else if (role === Role.STUDENT) {
      audiences.push(CalendarAudience.STUDENTS);
    }

    return this.prisma.calendarEvent.findMany({
      where: {
        instituteId,
        audience: { in: audiences },
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      include: {
        creator: { select: { id: true, name: true } }
      },
      orderBy: { date: 'asc' },
    });
  }

  async deleteEvent(userId: string, role: Role, instituteId: string, eventId: string) {
    const event = await this.prisma.calendarEvent.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.instituteId !== instituteId) throw new ForbiddenException();

    if (role !== Role.INSTITUTION_ADMIN && event.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own events');
    }

    return this.prisma.calendarEvent.delete({
      where: { id: eventId },
    });
  }

  async getNotificationCount(userId: string, instituteId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { lastViewedCalendar: true } });
    if (!user) return 0;

    const audiences: CalendarAudience[] = [CalendarAudience.ALL];
    if (role === Role.INSTITUTION_ADMIN) {
      audiences.push(CalendarAudience.INSTITUTION_ADMIN, CalendarAudience.TEACHERS, CalendarAudience.STUDENTS);
    } else if (role === Role.TEACHER) {
      audiences.push(CalendarAudience.TEACHERS, CalendarAudience.STUDENTS);
    } else if (role === Role.STUDENT) {
      audiences.push(CalendarAudience.STUDENTS);
    }

    return this.prisma.calendarEvent.count({
      where: {
        instituteId,
        audience: { in: audiences },
        createdAt: { gt: user.lastViewedCalendar },
        createdById: { not: userId }, // Don't notify about own events
      },
    });
  }

  async markCalendarViewed(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastViewedCalendar: new Date() },
    });
  }
}
