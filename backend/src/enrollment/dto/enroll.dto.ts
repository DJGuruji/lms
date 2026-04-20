import { IsOptional, IsUUID } from 'class-validator';

export class EnrollDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  courseId: string;

  /** Optional starter subject for the enrollment (TASK.md). */
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}
