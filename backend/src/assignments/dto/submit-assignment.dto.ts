import { IsString } from 'class-validator';

export class SubmitAssignmentDto {
  @IsString()
  fileUrl: string;
}
