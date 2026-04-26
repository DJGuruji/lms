import { IsString, IsNotEmpty, IsArray, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class TimeTableEntryDto {
  @IsString()
  @IsNotEmpty()
  dayOfWeek: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  startTime: string;

  @IsString()
  @IsNotEmpty()
  endTime: string;

  @IsString()
  @IsOptional()
  teacherName?: string;
}

export class SaveTimeTableDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TimeTableEntryDto)
  entries: TimeTableEntryDto[];
}
