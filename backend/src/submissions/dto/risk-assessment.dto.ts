import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RiskFlagDecision {
  REVIEWED = 'REVIEWED',
  DISMISSED = 'DISMISSED',
  CONFIRMED = 'CONFIRMED',
}

export class ReviewAnomalyFlagDto {
  @IsEnum(RiskFlagDecision)
  status: RiskFlagDecision;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
