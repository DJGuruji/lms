import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { MANAGE_CURRICULUM_ROLES } from '../auth/access.constants.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';

type Range = 'week' | 'month' | 'year';

function parseRange(raw: string | undefined): Range {
  if (raw === 'month' || raw === 'year') return raw;
  return 'week';
}

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_CURRICULUM_ROLES)
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('metrics')
  async metrics(
    @CurrentInstituteId() instituteId: string,
    @Query('range') rangeRaw: string | undefined,
  ) {
    const range = parseRange(rangeRaw);

    const now = new Date();
    const start = new Date(now);
    let bucket: 'day' | 'week' | 'month' = 'day';
    let points = 7;

    if (range === 'week') {
      start.setUTCDate(now.getUTCDate() - 6);
      start.setUTCHours(0, 0, 0, 0);
      bucket = 'day';
      points = 7;
    } else if (range === 'month') {
      const day = now.getUTCDay();
      const diff = day === 0 ? -6 : 1 - day;
      start.setUTCDate(now.getUTCDate() + diff - 21);
      start.setUTCHours(0, 0, 0, 0);
      bucket = 'week';
      points = 4;
    } else {
      start.setUTCMonth(now.getUTCMonth() - 11);
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
      bucket = 'month';
      points = 12;
    }

    const [
      userGrowth,
      enrollments,
      examSubmissions,
      contentViews,
      roleSplit,
    ] = await Promise.all([
      this.seriesUsers(instituteId, start, bucket, points),
      this.seriesEnrollments(instituteId, start, bucket, points),
      this.seriesExamSubmissions(instituteId, start, bucket, points),
      this.seriesContentViews(instituteId, start, bucket, points),
      this.splitRoles(instituteId),
    ]);

    return {
      range,
      bucket,
      start: start.toISOString(),
      end: now.toISOString(),
      userGrowth,
      enrollments,
      examSubmissions,
      contentViews,
      roleSplit,
    };
  }

  private async seriesUsers(
    instituteId: string,
    start: Date,
    bucket: 'day' | 'week' | 'month',
    points: number,
  ) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      select to_char(date_trunc($1, "createdAt"), 'YYYY-MM-DD') as bucket, count(*)::int as value
      from "User"
      where "instituteId" = $2 and "createdAt" >= $3
      group by 1
      order by 1 asc
      `,
      bucket,
      instituteId,
      start,
    )) as { bucket: string; value: number }[];

    return toSeries(rows, start, bucket, points);
  }

  private async seriesEnrollments(
    instituteId: string,
    start: Date,
    bucket: 'day' | 'week' | 'month',
    points: number,
  ) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      select to_char(date_trunc($1, e."createdAt"), 'YYYY-MM-DD') as bucket, count(*)::int as value
      from "Enrollment" e
      join "Course" c on c.id = e."courseId"
      where c."instituteId" = $2 and e."createdAt" >= $3
      group by 1
      order by 1 asc
      `,
      bucket,
      instituteId,
      start,
    )) as { bucket: string; value: number }[];

    return toSeries(rows, start, bucket, points);
  }

  private async seriesExamSubmissions(
    instituteId: string,
    start: Date,
    bucket: 'day' | 'week' | 'month',
    points: number,
  ) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      select to_char(date_trunc($1, r."createdAt"), 'YYYY-MM-DD') as bucket, count(*)::int as value
      from "Result" r
      join "Exam" e on e.id = r."examId"
      join "Course" c on c.id = e."courseId"
      where c."instituteId" = $2 and r."createdAt" >= $3
      group by 1
      order by 1 asc
      `,
      bucket,
      instituteId,
      start,
    )) as { bucket: string; value: number }[];

    return toSeries(rows, start, bucket, points);
  }

  private async seriesContentViews(
    instituteId: string,
    start: Date,
    bucket: 'day' | 'week' | 'month',
    points: number,
  ) {
    const rows = (await this.prisma.$queryRawUnsafe(
      `
      select to_char(date_trunc($1, "createdAt"), 'YYYY-MM-DD') as bucket, count(*)::int as value
      from "ContentView"
      where "instituteId" = $2 and "createdAt" >= $3
      group by 1
      order by 1 asc
      `,
      bucket,
      instituteId,
      start,
    )) as { bucket: string; value: number }[];

    return toSeries(rows, start, bucket, points);
  }

  private async splitRoles(instituteId: string) {
    const rows = await this.prisma.user.groupBy({
      by: ['role'],
      where: { instituteId },
      _count: { role: true },
      orderBy: { role: 'asc' },
    });
    return rows.map((r) => ({ role: r.role, count: r._count.role }));
  }
}

function getBucketKey(d: Date, bucket: 'day' | 'week' | 'month') {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  if (bucket === 'month') return `${y}-${m}-01`;
  return `${y}-${m}-${day}`;
}

function toSeries(
  rows: { bucket: string; value: number }[],
  start: Date,
  bucket: 'day' | 'week' | 'month',
  points: number,
) {
  const map = new Map<string, number>();
  for (const r of rows) {
    if (r.bucket) map.set(r.bucket, Number(r.value ?? 0));
  }

  const result: { label: string; value: number }[] = [];
  const cursor = new Date(start);
  for (let i = 0; i < points; i++) {
    const key = getBucketKey(cursor, bucket);
    result.push({
      label: cursor.toISOString(),
      value: map.get(key) ?? 0,
    });
    if (bucket === 'day') cursor.setUTCDate(cursor.getUTCDate() + 1);
    else if (bucket === 'week') cursor.setUTCDate(cursor.getUTCDate() + 7);
    else cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
}

