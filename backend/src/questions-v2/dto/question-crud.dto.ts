import { IsString, IsEnum, IsOptional, IsObject, IsInt, Min, Max, IsArray, IsNumber } from 'class-validator';

export class CreateQuestionCrudDto {
  @IsEnum(['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_IN_BLANK', 'MATCHING', 'ORDERING'])
  type: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  @IsOptional()
  @IsObject()
  correctAnswer?: Record<string, any>;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  defaultPoints?: number;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;
}

export class UpdateQuestionCrudDto {
  @IsOptional()
  @IsEnum(['MULTIPLE_CHOICE', 'MULTI_SELECT', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY', 'FILL_IN_BLANK', 'MATCHING', 'ORDERING'])
  type?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsObject()
  options?: Record<string, any>;

  @IsOptional()
  @IsObject()
  correctAnswer?: Record<string, any>;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  difficulty?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  defaultPoints?: number;

  @IsOptional()
  @IsString()
  courseId?: string;

  @IsOptional()
  @IsString()
  topicId?: string;
}
