import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateSubjectDto {
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string;

  @IsUUID()
  courseId: string;
}
