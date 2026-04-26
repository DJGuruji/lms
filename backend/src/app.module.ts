import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module.js';
import { ContentModule } from './content/content.module.js';
import { CoursesModule } from './courses/courses.module.js';
import { EnrollmentModule } from './enrollment/enrollment.module.js';
import { ExamsModule } from './exams/exams.module.js';
import { InstituteModule } from './institute/institute.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { ResultsModule } from './results/results.module.js';
import { StorageModule } from './storage/storage.module.js';
import { SubjectsModule } from './subjects/subjects.module.js';
import { TenantModule } from './tenant/tenant.module.js';
import { UsersModule } from './users/users.module.js';
import { MailModule } from './mail/mail.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AssignmentsModule } from './assignments/assignments.module.js';
import { QuestionBankModule } from './question-bank/question-bank.module.js';
import { TimeTableModule } from './time-table/time-table.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StorageModule,
    TenantModule,
    AuthModule,
    InstituteModule,
    UsersModule,
    CoursesModule,
    SubjectsModule,
    ContentModule,
    EnrollmentModule,
    ExamsModule,
    ResultsModule,
    MailModule,
    DashboardModule,
    AssignmentsModule,
    QuestionBankModule,
    TimeTableModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
