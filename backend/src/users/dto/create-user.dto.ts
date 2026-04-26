import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const ROLES_ON_CREATE = [
  'STUDENT',
  'TEACHER',
  'INSTITUTION_ADMIN',
  'ADMIN',
  'SUPER_ADMIN',
] as const;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(32)
  mobile?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password?: string;

  @IsOptional()
  @IsIn(ROLES_ON_CREATE as unknown as [string, ...string[]])
  role?: (typeof ROLES_ON_CREATE)[number];

  @IsOptional()
  @IsString({ each: true })
  courseIds?: string[];

  @IsOptional()
  @IsString()
  subjectId?: string;
}
