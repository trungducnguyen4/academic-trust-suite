import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class GenerateQuestionDto {
  @IsString()
  prompt: string;

  @IsOptional()
  @IsString()
  questionType?: string; // MULTIPLE_CHOICE, TRUE_FALSE, ESSAY, etc.

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  difficulty?: number;

  @IsOptional()
  @IsString()
  language?: string; // 'en' | 'vi'

  @IsOptional()
  @IsString()
  courseName?: string;

  @IsOptional()
  @IsString()
  useCase?: string; // 'exam' | 'question_bank'
}

export class GenerateExamQuestionsDto {
  @IsString()
  prompt: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  questionCount: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  difficulty?: number; // 0.3 | 0.5 | 0.7

  @IsOptional()
  @IsString()
  questionType?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  courseName?: string;

  @IsOptional()
  @IsString()
  useCase?: string; // 'exam' | 'question_bank'

  @IsOptional()
  @IsString()
  courseId?: string;
}
