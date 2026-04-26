import { IsString, IsNotEmpty, MaxLength, IsIn } from 'class-validator';

export class CreateItemDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['image', 'pdf'])
  fileType: string;
}
