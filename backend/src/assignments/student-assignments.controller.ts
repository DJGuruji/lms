import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ROLE_STUDENT } from '../auth/constants.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import type { JwtUser } from '../auth/interfaces/jwt-user.interface.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { AssignmentsService } from './assignments.service.js';
import { SubmitAssignmentDto } from './dto/submit-assignment.dto.js';

@Controller('student/assignments')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(ROLE_STUDENT)
export class StudentAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  list(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assignmentsService.listAssignmentsForStudent(instituteId, user.id);
  }

  @Post(':assignmentId/submit')
  submit(
    @CurrentInstituteId() instituteId: string,
    @CurrentUser() user: JwtUser,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: SubmitAssignmentDto,
  ) {
    return this.assignmentsService.submitAssignment(instituteId, user.id, assignmentId, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  uploadFile(
    @CurrentInstituteId() instituteId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('File required');
    return this.assignmentsService.upload(instituteId, file);
  }
}
