import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

export class GenerateExamLinkDto {
  @IsOptional()
  @IsDateString()
  expiryDatetime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxUses?: number;

  @IsOptional()
  @IsString()
  @MinLength(4)
  password?: string;

  @IsOptional()
  @IsBoolean()
  restrictedToCourse?: boolean;

  @IsOptional()
  @IsString()
  note?: string;
}

export class JoinExamLinkDto {
  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateExamLinkDto {
  @IsOptional()
  @IsBoolean()
  disabled?: boolean;

  @IsOptional()
  @IsDateString()
  expiryDatetime?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100000)
  maxUses?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
