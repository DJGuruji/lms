import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class ListUsersQueryDto {
  /** 1-indexed page. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Search by name/email (contains). */
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsIn(['STUDENT', 'TEACHER', 'INSTITUTION_ADMIN', 'ADMIN', 'SUPER_ADMIN'] as const as unknown as [string, ...string[]])
  role?: string;

  /** Filter by course (students enrolled OR teacher has subject in course). */
  @IsOptional()
  @IsUUID()
  courseId?: string;

  /** Filter by subject (students enrolled.subjectId OR teacher assigned subject). */
  @IsOptional()
  @IsUUID()
  subjectId?: string;
}

