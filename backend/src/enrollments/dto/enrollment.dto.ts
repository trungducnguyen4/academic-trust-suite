import { IsString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class CreateEnrollmentDto {
  @IsString()
  courseId: string;

  @IsString()
  studentId: string;
}

export class BulkEnrollmentDto {
  @IsString()
  courseId: string;

  @IsArray()
  @IsString({ each: true })
  studentIds: string[];
}

export class BulkEnrollByEmailsDto {
  @IsString()
  courseId: string;

  @IsArray()
  @IsString({ each: true })
  emails: string[];
}

export class UpdateEnrollmentStatusDto {
  @IsEnum(['ACTIVE', 'DROPPED', 'COMPLETED'])
  status: 'ACTIVE' | 'DROPPED' | 'COMPLETED';
}
