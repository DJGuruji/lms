import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UploadContentDto {
  @IsString()
  @MinLength(2)
  @MaxLength(300)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsUUID()
  subjectId: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  type: string;
}
