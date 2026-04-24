import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MANAGE_CURRICULUM_ROLES } from '../auth/access.constants.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { CurrentInstituteId } from '../tenant/decorators/current-institute-id.decorator.js';
import { AssignmentsService } from './assignments.service.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';

@Controller('subjects/:subjectId/assignments')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles(...MANAGE_CURRICULUM_ROLES)
export class AdminAssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  create(
    @CurrentInstituteId() instituteId: string,
    @Param('subjectId') subjectId: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.assignmentsService.createSubjectAssignment(instituteId, subjectId, dto);
  }

  @Get()
  list(
    @CurrentInstituteId() instituteId: string,
    @Param('subjectId') subjectId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.assignmentsService.listAssignmentsBySubject(
      instituteId,
      subjectId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 8,
    );
  }

  @Get(':assignmentId/submissions')
  listSubmissions(
    @CurrentInstituteId() instituteId: string,
    @Param('subjectId') subjectId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.listSubmissionsForAssignment(instituteId, subjectId, assignmentId);
  }

  @Delete(':assignmentId')
  remove(
    @CurrentInstituteId() instituteId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.removeAssignment(instituteId, assignmentId);
  }

  @Patch(':assignmentId')
  update(
    @CurrentInstituteId() instituteId: string,
    @Param('assignmentId') assignmentId: string,
    @Body() dto: UpdateAssignmentDto,
  ) {
    return this.assignmentsService.updateAssignment(instituteId, assignmentId, dto);
  }

  @Patch(':assignmentId/toggle-publish')
  togglePublish(
    @CurrentInstituteId() instituteId: string,
    @Param('assignmentId') assignmentId: string,
  ) {
    return this.assignmentsService.togglePublish(instituteId, assignmentId);
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
