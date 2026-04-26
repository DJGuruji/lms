import { Module } from '@nestjs/common';
import { CalendarService } from './calendar.service.js';
import { AdminCalendarController } from './admin-calendar.controller.js';
import { StudentCalendarController } from './student-calendar.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdminCalendarController, StudentCalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
