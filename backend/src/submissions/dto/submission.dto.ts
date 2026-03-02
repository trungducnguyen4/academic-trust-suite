import { IsString, IsOptional, IsObject, IsArray, IsInt, Min, Max, IsEnum } from 'class-validator';

export class StartExamDto {
  @IsString()
  examId: string;
}

export class SubmitAnswerDto {
  @IsString()
  questionId: string;

  @IsObject()
  answer: Record<string, any>;

  @IsOptional()
  @IsInt()
  timeTaken?: number; // in seconds
}

export class SubmitExamDto {
  @IsArray()
  answers: SubmitAnswerDto[];
}

export class GradeAnswerDto {
  @IsString()
  submissionAnswerId: string;

  @IsInt()
  @Min(0)
  pointsAwarded: number;

  @IsOptional()
  @IsString()
  feedback?: string;
}

export class UpdateSubmissionStatusDto {
  @IsEnum(['IN_PROGRESS', 'SUBMITTED', 'GRADED', 'FLAGGED'])
  status: string;
}
