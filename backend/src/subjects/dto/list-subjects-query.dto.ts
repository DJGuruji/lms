import { IsUUID } from 'class-validator';

export class ListSubjectsQueryDto {
  @IsUUID()
  courseId: string;
}
