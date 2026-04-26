import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TimeTableService } from './time-table.service.js';
import { AdminTimeTableController } from './admin-time-table.controller.js';
import { StudentTimeTableController } from './student-time-table.controller.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdminTimeTableController, StudentTimeTableController],
  providers: [TimeTableService],
  exports: [TimeTableService],
})
export class TimeTableModule {}
