import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { Role } from '@prisma/client';
import {
  ROLE_ADMIN,
  ROLE_INSTITUTION_ADMIN,
  ROLE_STUDENT,
  ROLE_SUPER_ADMIN,
  ROLE_TEACHER,
} from '../auth/constants.js';
import { MailService } from '../mail/mail.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { forInstitute } from '../tenant/tenant-scope.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

const BCRYPT_ROUNDS = 12;

export const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  mobile: true,
  role: true,
  instituteId: true,
} as const;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async create(instituteId: string, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const password =
      dto.password ?? randomBytes(12).toString('base64url').slice(0, 16);
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const role = (dto.role ?? ROLE_STUDENT) as Role;

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        const u = await tx.user.create({
          data: {
            name: dto.name.trim(),
            email,
            ...(dto.mobile ? { mobile: dto.mobile.trim() } : {}),
            password: hashed,
            role,
            instituteId,
          },
          select: userPublicSelect,
        });

        if (role === ROLE_STUDENT && dto.courseIds?.length) {
          await tx.enrollment.createMany({
            data: dto.courseIds.map((courseId) => ({
              studentId: u.id,
              courseId,
              subjectId: dto.subjectId || null,
            })),
            skipDuplicates: true,
          });
        }
        return u;
      });

      const temporaryPassword = dto.password ? undefined : password;
      if (temporaryPassword) {
        void this.mailService
          .sendLoginCredentials({
            to: email,
            name: user.name,
            password: temporaryPassword,
          })
          .catch(() => undefined);
      }
      return {
        user,
        /** Only when password was auto-generated (no password in request). */
        temporaryPassword,
      };
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async findAll(instituteId: string) {
    return this.prisma.user.findMany({
      where: forInstitute(instituteId),
      select: userPublicSelect,
      orderBy: { email: 'asc' },
    });
  }

  async findPage(instituteId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    // Back-compat: old callers pass only page/limit (no filters).
    return this.findPageFiltered(instituteId, { page, limit, skip });
  }

  async findOne(instituteId: string, userId: string) {
    await this.ensureUserInTenant(userId, instituteId);
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userPublicSelect,
        enrollments: {
          select: {
            courseId: true,
            subjectId: true,
          },
        },
        teacherSubjects: {
          select: {
            subjectId: true,
            subject: {
              select: {
                courseId: true,
              },
            },
          },
        },
      },
    });
  }

  async findPageFiltered(
    instituteId: string,
    opts: {
      page: number;
      limit: number;
      q?: string;
      role?: Role;
      courseId?: string;
      subjectId?: string;
      skip?: number;
    },
  ) {
    const skip = opts.skip ?? (opts.page - 1) * opts.limit;
    const q = opts.q?.trim();

    const where = {
      ...forInstitute(instituteId),
      ...(opts.role ? { role: opts.role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(opts.courseId
        ? {
            OR: [
              { enrollments: { some: { courseId: opts.courseId } } },
              {
                // `teacherSubject` exists after prisma migrate+generate.
                teacherSubjects: {
                  some: { subject: { courseId: opts.courseId } },
                },
              },
            ],
          }
        : {}),
      ...(opts.subjectId
        ? {
            OR: [
              { enrollments: { some: { subjectId: opts.subjectId } } },
              { teacherSubjects: { some: { subjectId: opts.subjectId } } },
            ],
          }
        : {}),
    } as const;

    const [total, items] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { email: 'asc' },
        skip,
        take: opts.limit,
      }),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async exportCsv(
    instituteId: string,
    filters: { q?: string; role?: Role; courseId?: string; subjectId?: string },
  ) {
    const q = filters.q?.trim();
    const where = {
      ...forInstitute(instituteId),
      ...(filters.role ? { role: filters.role } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' as const } },
              { email: { contains: q, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(filters.courseId
        ? {
            OR: [
              { enrollments: { some: { courseId: filters.courseId } } },
              {
                teacherSubjects: {
                  some: { subject: { courseId: filters.courseId } },
                },
              },
            ],
          }
        : {}),
      ...(filters.subjectId
        ? {
            OR: [
              { enrollments: { some: { subjectId: filters.subjectId } } },
              { teacherSubjects: { some: { subjectId: filters.subjectId } } },
            ],
          }
        : {}),
    } as const;

    const rows = await this.prisma.user.findMany({
      where,
      select: {
        ...userPublicSelect,
        enrollments: {
          select: {
            course: { select: { id: true, name: true } },
            subject: { select: { id: true, name: true } },
          },
        },
        teacherSubjects: {
          select: {
            subject: {
              select: {
                id: true,
                name: true,
                course: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { email: 'asc' },
    });

    const header = [
      'id',
      'name',
      'email',
      'mobile',
      'role',
      'courses',
      'subjects',
    ] as const;
    const escape = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };

    const lines = [
      header.join(','),
      ...rows.map((u) => {
        const studentCourses = (u as any).enrollments?.map((e: any) => e.course) ?? [];
        const studentSubjects = (u as any).enrollments
          ?.map((e: any) => e.subject)
          ?.filter(Boolean) ?? [];

        const teacherSubjects = (u as any).teacherSubjects?.map((ts: any) => ts.subject) ?? [];
        const teacherCourses = teacherSubjects.map((s: any) => s.course).filter(Boolean);

        const allCourses = [...studentCourses, ...teacherCourses]
          .filter(Boolean)
          .reduce((acc: Map<string, string>, c: any) => {
            acc.set(c.id, c.name);
            return acc;
          }, new Map<string, string>());

        const allSubjects = [...studentSubjects, ...teacherSubjects]
          .filter(Boolean)
          .reduce((acc: Map<string, string>, s: any) => {
            acc.set(s.id, s.name);
            return acc;
          }, new Map<string, string>());

        const courses = Array.from(allCourses.values())
          .map(String)
          .sort((a: string, b: string) => a.localeCompare(b))
          .join(' | ');
        const subjects = Array.from(allSubjects.values())
          .map(String)
          .sort((a: string, b: string) => a.localeCompare(b))
          .join(' | ');

        return [u.id, u.name, u.email, u.mobile ?? '', u.role, courses, subjects]
          .map(escape)
          .join(',');
      }),
    ];
    return lines.join('\r\n');
  }

  async update(instituteId: string, userId: string, dto: UpdateUserDto) {
    await this.ensureUserInTenant(userId, instituteId);
    
    const email = dto.email?.trim().toLowerCase();
    const hashed =
      dto.password && dto.password.trim()
        ? await bcrypt.hash(dto.password.trim(), BCRYPT_ROUNDS)
        : undefined;

    try {
      return await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.update({
          where: { id: userId },
          data: {
            ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
            ...(email !== undefined ? { email } : {}),
            ...(dto.mobile !== undefined ? { mobile: dto.mobile.trim() } : {}),
            ...(hashed !== undefined ? { password: hashed } : {}),
            ...(dto.role !== undefined ? { role: dto.role as Role } : {}),
          },
          select: userPublicSelect,
        });

        // Handle Student Enrollment update
        if (user.role === ROLE_STUDENT && dto.courseIds !== undefined) {
          const current = await tx.enrollment.findMany({
            where: { studentId: userId },
            select: { courseId: true },
          });
          const currentIds = new Set(current.map((e) => e.courseId));
          const targetIds = new Set(dto.courseIds);

          const toDelete = current.filter((e) => !targetIds.has(e.courseId)).map((e) => e.courseId);
          const toAdd = dto.courseIds.filter((id) => !currentIds.has(id));

          if (toDelete.length > 0) {
            await tx.enrollment.deleteMany({
              where: { studentId: userId, courseId: { in: toDelete } },
            });
          }

          if (toAdd.length > 0) {
            await tx.enrollment.createMany({
              data: toAdd.map((courseId) => ({
                studentId: userId,
                courseId,
                subjectId: dto.subjectId || null,
              })),
              skipDuplicates: true,
            });
          }

          // If subjectId changed, we might want to update it for ALL enrollments or just specific ones?
          // The user's request just said "multi select course dropdown".
          // For simplicity, if subjectId is provided, we'll apply it to the new ones.
          // Existing ones keep their subjectId unless they were part of the new list.
        }

        // Handle Teacher Subject assignments
        if (user.role === ROLE_TEACHER && dto.teacherSubjectIds) {
          const validSubjects = await tx.subject.findMany({
            where: {
              id: { in: dto.teacherSubjectIds },
              course: { instituteId },
            },
            select: { id: true },
          });

          if (validSubjects.length !== dto.teacherSubjectIds.length) {
            throw new BadRequestException('Some subjects are invalid for this institute');
          }

          await (tx as any).teacherSubject.deleteMany({ where: { teacherId: userId } });
          await (tx as any).teacherSubject.createMany({
            data: dto.teacherSubjectIds.map((subjectId) => ({
              teacherId: userId,
              subjectId,
            })),
          });
        }

        return user;
      });
    } catch (err) {
      if (err instanceof PrismaClientKnownRequestError) {
        if (err.code === 'P2025') throw new NotFoundException('User not found');
        if (err.code === 'P2002') throw new ConflictException('Email already in use');
      }
      throw err;
    }
  }

  async remove(instituteId: string, userId: string) {
    await this.ensureUserInTenant(userId, instituteId);
    await this.prisma.user.delete({
      where: { id: userId },
    });
    return { deleted: true };
  }

  async assignTeacherSubjects(
    instituteId: string,
    teacherId: string,
    subjectIds: string[],
  ) {
    const teacher = await this.prisma.user.findFirst({
      where: { id: teacherId, instituteId, role: ROLE_TEACHER },
      select: { id: true },
    });
    if (!teacher) {
      throw new BadRequestException('Teacher not found in this institute');
    }

    const subjects = await this.prisma.subject.findMany({
      where: {
        id: { in: subjectIds },
        course: { instituteId },
      },
      select: { id: true },
    });
    if (subjects.length !== subjectIds.length) {
      throw new BadRequestException(
        'Some subjects are invalid for this institute',
      );
    }

    await this.prisma.$transaction([
      // `teacherSubject` exists after prisma migrate+generate.
      (this.prisma as any).teacherSubject.deleteMany({ where: { teacherId } }),
      (this.prisma as any).teacherSubject.createMany({
        data: subjectIds.map((subjectId) => ({ teacherId, subjectId })),
      }),
    ]);

    return { ok: true, teacherId, subjectIds };
  }

  async bulkImport(instituteId: string, buffer: Buffer, originalName?: string) {
    const name = (originalName ?? '').toLowerCase();
    const isXlsx = name.endsWith('.xlsx') || name.endsWith('.xls');

    let rows: Record<string, string>[];
    if (isXlsx) {
      try {
        const wb = XLSX.read(buffer, { type: 'buffer' });
        const first = wb.SheetNames[0];
        if (!first) throw new Error('Missing sheet');
        const sheet = wb.Sheets[first];
        const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          defval: '',
          raw: false,
        });
        rows = json.map((r) => {
          const out: Record<string, string> = {};
          for (const [k, v] of Object.entries(r)) out[String(k)] = String(v ?? '');
          return out;
        });
      } catch {
        throw new BadRequestException('Invalid XLSX');
      }
    } else {
      try {
        rows = parse(buffer, {
          columns: true,
          skip_empty_lines: true,
          trim: true,
          relax_column_count: true,
        }) as Record<string, string>[];
      } catch {
        throw new BadRequestException('Invalid CSV');
      }
    }

    const created: {
      email: string;
      temporaryPassword?: string;
    }[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = pickCol(row, 'name') ?? pickCol(row, 'username');
      const emailRaw = pickCol(row, 'email');
      const roleRaw = pickCol(row, 'role');
      const passwordRaw = pickCol(row, 'password');
      const mobileRaw = pickCol(row, 'mobile');
      const courseRaw = pickCol(row, 'course');
      const subjectRaw = pickCol(row, 'subject');

      const rowNum = i + 2;
      if (!name || !emailRaw) {
        errors.push({ row: rowNum, message: 'name and email are required' });
        continue;
      }

      const email = emailRaw.trim().toLowerCase();
      const password =
        passwordRaw?.trim() ||
        randomBytes(12).toString('base64url').slice(0, 16);
      const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const role = (normalizeRole(roleRaw) ?? ROLE_STUDENT) as Role;
      if (
        role !== ROLE_STUDENT &&
        role !== ROLE_TEACHER &&
        role !== ROLE_INSTITUTION_ADMIN
      ) {
        errors.push({
          row: rowNum,
          message:
            'role must be STUDENT, TEACHER, or INSTITUTION_ADMIN for bulk upload',
        });
        continue;
      }

      const courseIds = parseMulti(courseRaw);
      const subjectIds = parseMulti(subjectRaw);
      if (role === ROLE_STUDENT && subjectIds.length > 0 && courseIds.length !== 1) {
        errors.push({
          row: rowNum,
          message:
            'for STUDENT: subject list is allowed only when exactly one course is provided',
        });
        continue;
      }

      try {
        const createdUser = await this.prisma.user.create({
          data: {
            name: name.trim(),
            email,
            ...(mobileRaw?.trim() ? { mobile: mobileRaw.trim() } : {}),
            password: hashed,
            role,
            instituteId,
          },
          select: { id: true, email: true },
        });

        // Optional course/subject assignments.
        if (role === ROLE_STUDENT && courseIds.length > 0) {
          const validCourses = await this.prisma.course.findMany({
            where: { id: { in: courseIds }, instituteId },
            select: { id: true },
          });
          const validCourseIds = new Set(validCourses.map((c) => c.id));
          const invalid = courseIds.filter((id) => !validCourseIds.has(id));
          if (invalid.length) {
            throw new BadRequestException(
              `invalid course ids: ${invalid.join(', ')}`,
            );
          }

          const subjectId =
            subjectIds.length === 1 ? subjectIds[0] : undefined;
          if (subjectId) {
            const subjectOk = await this.prisma.subject.findFirst({
              where: {
                id: subjectId,
                course: { id: courseIds[0], instituteId },
              },
              select: { id: true },
            });
            if (!subjectOk) {
              throw new BadRequestException('invalid subject for course');
            }
          }

          await this.prisma.enrollment.createMany({
            data: courseIds.map((courseId) => ({
              studentId: createdUser.id,
              courseId,
              ...(subjectId ? { subjectId } : {}),
            })),
            skipDuplicates: true,
          });
        }

        if (role === ROLE_TEACHER && subjectIds.length > 0) {
          const subjects = await this.prisma.subject.findMany({
            where: {
              id: { in: subjectIds },
              course: { instituteId },
            },
            select: { id: true },
          });
          if (subjects.length !== subjectIds.length) {
            throw new BadRequestException(
              'some subject ids are invalid for this institute',
            );
          }
          await (this.prisma as any).teacherSubject.createMany({
            data: subjectIds.map((subjectId) => ({
              teacherId: createdUser.id,
              subjectId,
            })),
            skipDuplicates: true,
          });
        }

        created.push({
          email,
          temporaryPassword: passwordRaw?.trim() ? undefined : password,
        });
      } catch (err) {
        if (
          err instanceof PrismaClientKnownRequestError &&
          err.code === 'P2002'
        ) {
          errors.push({ row: rowNum, message: 'duplicate email' });
        } else {
          errors.push({
            row: rowNum,
            message: err instanceof Error ? err.message : 'failed',
          });
        }
      }
    }

    return { createdCount: created.length, created, errors };
  }

  async findPeers(instituteId: string, studentId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    // Find course IDs of this student
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: { courseId: true },
    });
    const courseIds = enrollments.map(e => e.courseId);

    if (courseIds.length === 0) {
      return { items: [], total: 0 };
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          instituteId,
          role: ROLE_STUDENT as Role,
          id: { not: studentId },
          enrollments: {
            some: {
              courseId: { in: courseIds }
            }
          }
        },
        select: userPublicSelect,
        orderBy: { name: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({
        where: {
          instituteId,
          role: ROLE_STUDENT as Role,
          id: { not: studentId },
          enrollments: {
            some: {
              courseId: { in: courseIds }
            }
          }
        },
      }),
    ]);

    return { items, total };
  }

  private async ensureUserInTenant(userId: string, instituteId: string) {
    const u = await this.prisma.user.findFirst({
      where: { id: userId, instituteId },
      select: { id: true },
    });
    if (!u) {
      throw new NotFoundException('User not found');
    }
  }
}

function pickCol(row: Record<string, string>, key: string): string | undefined {
  const lower = key.toLowerCase();
  for (const [k, v] of Object.entries(row)) {
    if (k.trim().toLowerCase() === lower && v !== undefined && v !== '') {
      return String(v);
    }
  }
  return undefined;
}

function normalizeRole(raw: string | undefined): Role | undefined {
  if (!raw?.trim()) return undefined;
  const r = raw.trim().toUpperCase();
  if (
    r === ROLE_STUDENT ||
    r === ROLE_TEACHER ||
    r === ROLE_INSTITUTION_ADMIN ||
    r === ROLE_ADMIN ||
    r === ROLE_SUPER_ADMIN
  ) {
    return r as Role;
  }
  return undefined;
}

function parseMulti(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  // Accept: "id1|id2", "id1;id2", "id1, id2"
  return raw
    .split(/[|;,]/g)
    .map((s) => s.trim())
    .filter(Boolean);
}
