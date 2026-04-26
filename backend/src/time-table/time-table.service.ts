import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SaveTimeTableDto } from './dto/save-time-table.dto.js';

@Injectable()
export class TimeTableService {
  constructor(private readonly prisma: PrismaService) {}

  async getTimeTable(courseId: string) {
    const timeTable = await this.prisma.timeTable.findUnique({
      where: { courseId },
      include: {
        entries: {
          orderBy: [
            { dayOfWeek: 'asc' }, // Note: string sort might need helper for logical day sort
            { startTime: 'asc' },
          ],
        },
      },
    });

    if (!timeTable) return null;

    // Optional: Sort entries logically by day of week if needed in backend
    return timeTable;
  }

  async saveTimeTable(courseId: string, dto: SaveTimeTableDto) {
    // Check if course exists
    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    // Use transaction to update time table and its entries
    return this.prisma.$transaction(async (tx) => {
      let timeTable = await tx.timeTable.findUnique({ where: { courseId } });

      if (!timeTable) {
        timeTable = await tx.timeTable.create({
          data: { courseId },
        });
      }

      // Delete existing entries and replace with new ones
      await tx.timeTableEntry.deleteMany({
        where: { timeTableId: timeTable.id },
      });

      await tx.timeTableEntry.createMany({
        data: dto.entries.map((e) => ({
          ...e,
          timeTableId: timeTable!.id,
        })),
      });

      return tx.timeTable.findUnique({
        where: { id: timeTable.id },
        include: { entries: true },
      });
    });
  }
}
