import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const ASSIGNABLE = ['STUDENT', 'TEACHER', 'ADMIN'] as const;

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE as unknown as [string, ...string[]])
  role?: (typeof ASSIGNABLE)[number];
}
