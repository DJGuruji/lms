import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { MANAGE_USERS_ROLES } from '../auth/access.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { Role } from '@prisma/client';
import {
  ROLE_ADMIN,
  ROLE_INSTITUTION_ADMIN,
  ROLE_SUPER_ADMIN,
  ROLE_TEACHER,
} from '../auth/constants.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';
import { TeacherAssignSubjectsDto } from './dto/teacher-assign-subjects.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_USERS_ROLES)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(
    @CurrentInstituteId() instituteId: string,
    @Query() query: ListUsersQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const role = query.role ? (query.role as Role) : undefined;
    return this.usersService.findPageFiltered(instituteId, {
      page,
      limit,
      q: query.q,
      role,
      courseId: query.courseId,
      subjectId: query.subjectId,
    });
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  export(
    @CurrentInstituteId() instituteId: string,
    @Query() query: ListUsersQueryDto,
    @Res() res: Response,
  ) {
    const role = query.role ? (query.role as Role) : undefined;
    const filename = `users-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return this.usersService
      .exportCsv(instituteId, {
        q: query.q,
        role,
        courseId: query.courseId,
        subjectId: query.subjectId,
      })
      .then((csv) => res.send(csv));
  }

  @Post()
  create(
    @CurrentInstituteId() instituteId: string,
    @Body() dto: CreateUserDto,
    @CurrentUser() me: JwtUser,
  ) {
    // Institution admins can create only institute-scoped accounts (student/teacher/institution admin).
    if (me.role === ROLE_INSTITUTION_ADMIN) {
      const r = dto.role ?? 'STUDENT';
      if (r !== 'STUDENT' && r !== 'TEACHER' && r !== 'INSTITUTION_ADMIN') {
        throw new BadRequestException('You may only create students or teachers');
      }
    }
    // Teachers can only create students.
    if (me.role === ROLE_TEACHER) {
      const r = dto.role ?? 'STUDENT';
      if (r !== 'STUDENT') {
        throw new BadRequestException('Teachers may only create students');
      }
    }
    // SUPER_ADMIN/ADMIN may create any role (kept for future).
    return this.usersService.create(instituteId, dto);
  }

  /** CSV columns: name,email[,role][,password] — role: STUDENT|TEACHER|ADMIN */
  @Post('bulk')
  @UseInterceptors(FileInterceptor('file'))
  bulkCsv(
    @CurrentInstituteId() instituteId: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('CSV file required (field: file)');
    }
    return this.usersService.bulkCsv(instituteId, file.buffer);
  }

  @Patch(':id')
  update(
    @CurrentInstituteId() instituteId: string,
    @Param('id', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() me: JwtUser,
  ) {
    if (me.role === ROLE_INSTITUTION_ADMIN && dto.role) {
      if (dto.role !== 'STUDENT' && dto.role !== 'TEACHER' && dto.role !== 'INSTITUTION_ADMIN') {
        throw new BadRequestException('You may only assign student/teacher roles');
      }
    }
    if (me.role === ROLE_TEACHER && dto.role && dto.role !== 'STUDENT') {
      throw new BadRequestException('Teachers may only manage students');
    }
    return this.usersService.update(instituteId, userId, dto);
  }

  @Delete(':id')
  remove(
    @CurrentInstituteId() instituteId: string,
    @Param('id', ParseUUIDPipe) userId: string,
    @CurrentUser() me: JwtUser,
  ) {
    if (userId === me.id) {
      throw new BadRequestException('Cannot delete your own account');
    }
    return this.usersService.remove(instituteId, userId);
  }

  /** Teacher course/subject mapping (TASK.md). */
  @Post('teachers/assign-subjects')
  assignTeacherSubjects(
    @CurrentInstituteId() instituteId: string,
    @Body() dto: TeacherAssignSubjectsDto,
  ) {
    return this.usersService.assignTeacherSubjects(
      instituteId,
      dto.teacherId,
      dto.subjectIds,
    );
  }
}
