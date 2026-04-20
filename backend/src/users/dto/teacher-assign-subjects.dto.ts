import { ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';

export class TeacherAssignSubjectsDto {
  @IsUUID()
  teacherId: string;

  /** Subjects the teacher can teach (courses inferred from subjects). */
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  subjectIds: string[];
}

