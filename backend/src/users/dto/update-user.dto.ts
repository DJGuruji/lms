import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const ASSIGNABLE = [
  'STUDENT',
  'TEACHER',
  'INSTITUTION_ADMIN',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  /** Leave empty to keep existing password. */
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  mobile?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE as unknown as [string, ...string[]])
  role?: (typeof ASSIGNABLE)[number];

  @IsOptional()
  @IsString({ each: true })
  courseIds?: string[];

  @IsOptional()
  @IsString()
  subjectId?: string;

  @IsOptional()
  @IsString({ each: true })
  teacherSubjectIds?: string[];
}
