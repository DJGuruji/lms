import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SubjectsModule } from '../subjects/subjects.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { QuestionBankService } from './question-bank.service.js';
import { AdminQuestionBankController } from './admin-question-bank.controller.js';
import { StudentQuestionBankController } from './student-question-bank.controller.js';

@Module({
  imports: [PrismaModule, SubjectsModule, StorageModule],
  controllers: [AdminQuestionBankController, StudentQuestionBankController],
  providers: [QuestionBankService],
  exports: [QuestionBankService],
})
export class QuestionBankModule {}
