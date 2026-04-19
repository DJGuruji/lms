import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { PrismaClientKnownRequestError } from '@prisma/client-runtime-utils';
import { ROLE_STUDENT } from '../auth/constants.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { forInstitute } from '../tenant/tenant-scope.js';
import type { CreateUserDto } from './dto/create-user.dto.js';
import type { UpdateUserDto } from './dto/update-user.dto.js';

const BCRYPT_ROUNDS = 12;

const userPublicSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  instituteId: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(instituteId: string, dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const password =
      dto.password ?? randomBytes(12).toString('base64url').slice(0, 16);
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const role = dto.role ?? ROLE_STUDENT;

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email,
          password: hashed,
          role,
          instituteId,
        },
        select: userPublicSelect,
      });
      return {
        user,
        /** Only when password was auto-generated (no password in request). */
        temporaryPassword: dto.password ? undefined : password,
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

  async update(instituteId: string, userId: string, dto: UpdateUserDto) {
    await this.ensureUserInTenant(userId, instituteId);
    if (dto.name === undefined && dto.role === undefined) {
      throw new BadRequestException('Nothing to update');
    }
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
          ...(dto.role !== undefined ? { role: dto.role } : {}),
        },
        select: userPublicSelect,
      });
    } catch (err) {
      if (
        err instanceof PrismaClientKnownRequestError &&
        err.code === 'P2025'
      ) {
        throw new NotFoundException('User not found');
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

  async bulkCsv(instituteId: string, buffer: Buffer) {
    let rows: Record<string, string>[];
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

    const created: {
      email: string;
      temporaryPassword?: string;
    }[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = pickCol(row, 'name');
      const emailRaw = pickCol(row, 'email');
      const roleRaw = pickCol(row, 'role');
      const passwordRaw = pickCol(row, 'password');

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
      const role = normalizeRole(roleRaw) ?? ROLE_STUDENT;

      try {
        await this.prisma.user.create({
          data: {
            name: name.trim(),
            email,
            password: hashed,
            role,
            instituteId,
          },
          select: { email: true },
        });
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

function normalizeRole(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  const r = raw.trim().toUpperCase();
  if (r === 'STUDENT' || r === 'TEACHER' || r === 'ADMIN') return r;
  return undefined;
}
