import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MANAGE_USERS_ROLES } from '../auth/access.constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_USERS_ROLES)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  list(@CurrentInstituteId() instituteId: string) {
    return this.usersService.findAll(instituteId);
  }

  @Post()
  create(
    @CurrentInstituteId() instituteId: string,
    @Body() dto: CreateUserDto,
  ) {
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
  ) {
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
}
