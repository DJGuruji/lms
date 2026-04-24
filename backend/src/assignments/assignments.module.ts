import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SubjectsModule } from '../subjects/subjects.module.js';
import { StorageModule } from '../storage/storage.module.js';
import { AdminAssignmentsController } from './admin-assignments.controller.js';
import { StudentAssignmentsController } from './student-assignments.controller.js';
import { AssignmentsService } from './assignments.service.js';

@Module({
  imports: [PrismaModule, SubjectsModule, StorageModule],
  controllers: [AdminAssignmentsController, StudentAssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
