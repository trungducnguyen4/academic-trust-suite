import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListQuestionsQueryDto {
  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsString()
  tagId?: string;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'IN_REVIEW', 'PUBLISHED', 'ARCHIVED'])
  status?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}
