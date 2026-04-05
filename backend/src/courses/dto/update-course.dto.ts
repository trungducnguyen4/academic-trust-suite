import { IsString, IsOptional, IsInt, Min, Max, IsUUID } from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  credits?: number;

  @IsOptional()
  @IsString()
  semester?: string;

  @IsOptional()
  @IsUUID()
  lecturerId?: string | null;
}
