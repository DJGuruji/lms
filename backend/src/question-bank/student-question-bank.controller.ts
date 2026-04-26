import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RoleGuard } from '../auth/guards/role.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { QuestionBankService } from './question-bank.service.js';

@Controller('student/subjects/:subjectId/question-bank')
@UseGuards(JwtAuthGuard, RoleGuard)
@Roles('STUDENT', 'TEACHER', 'ADMIN', 'INSTITUTION_ADMIN', 'SUPER_ADMIN')
export class StudentQuestionBankController {
  constructor(private readonly qbService: QuestionBankService) {}

  @Get('folders')
  listFolders(@Param('subjectId') subjectId: string) {
    return this.qbService.listFoldersForStudent(subjectId);
  }
}
