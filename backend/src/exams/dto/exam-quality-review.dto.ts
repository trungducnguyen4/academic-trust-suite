import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum QualityReviewDecision {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  NEEDS_CHANGES = 'NEEDS_CHANGES',
}

export class ReviewQualitySuggestionDto {
  @IsEnum(QualityReviewDecision)
  decision: QualityReviewDecision;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
