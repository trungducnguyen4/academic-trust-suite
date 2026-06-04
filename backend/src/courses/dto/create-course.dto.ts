import { IsString, IsOptional, IsInt, Min, Max, IsUUID, IsEnum, Matches } from 'class-validator';
import { CourseTerm } from './course-term.enum';

export class CreateCourseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  subjectCode?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  credits?: number;

  @IsString()
  @Matches(/^\d{4}-\d{4}$/, { message: 'academicYear must be in YYYY-YYYY format' })
  academicYear: string;

  @IsEnum(CourseTerm)
  term: CourseTerm;

  @IsOptional()
  @IsUUID()
  lecturerId?: string;
}
