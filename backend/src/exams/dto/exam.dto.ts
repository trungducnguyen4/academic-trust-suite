import { IsString, IsEnum, IsOptional, IsObject, IsInt, IsDateString, IsArray, Min, IsBoolean, IsEmail, IsNumber } from 'class-validator';

export class CreateExamDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  courseId: string;

  @IsInt()
  @Min(1)
  duration: number; // in minutes

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number | null;

  @IsOptional()
  @IsEnum(['HIGHEST', 'AVERAGE', 'FIRST_ATTEMPT', 'LAST_ATTEMPT'])
  gradingStrategy?: string | null;

  @IsOptional()
  @IsObject()
  reviewSettings?: Record<string, any> | null;

  @IsOptional()
  @IsObject()
  questionSelectionConfig?: Record<string, any> | null;

  @IsOptional()
  @IsEnum(['NORMAL', 'LAB'])
  mode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @IsOptional()
  @IsArray()
  questionIds?: string[];
}

export class UpdateExamDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  timeLimitMinutes?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  totalPoints?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  passingScore?: number;

  @IsOptional()
  @IsDateString()
  startTime?: string;

  @IsOptional()
  @IsDateString()
  endTime?: string;

  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxAttempts?: number | null;

  @IsOptional()
  @IsEnum(['HIGHEST', 'AVERAGE', 'FIRST_ATTEMPT', 'LAST_ATTEMPT'])
  gradingStrategy?: string | null;

  @IsOptional()
  @IsObject()
  reviewSettings?: Record<string, any> | null;

  @IsOptional()
  @IsObject()
  questionSelectionConfig?: Record<string, any> | null;

  @IsOptional()
  @IsEnum(['NORMAL', 'LAB'])
  mode?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipWhitelist?: string[];

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'ARCHIVED'])
  status?: string;
}

export class RescheduleExamDto {
  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;
}

export class AddQuestionsToExamDto {
  @IsArray()
  @IsString({ each: true })
  questionIds: string[];
}

export class UpdateExamQuestionDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  orderIndex?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  points?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  assignedScore?: number;
}

export class ShareExamDto {
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];
  @IsOptional()
  @IsBoolean()
  sendToCourse?: boolean;
}
