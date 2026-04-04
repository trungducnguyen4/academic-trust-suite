import { IsString, IsOptional, IsEnum, IsEmail, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'LECTURER', 'STUDENT'])
  role?: 'ADMIN' | 'LECTURER' | 'STUDENT';

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(['active', 'suspended', 'pending'])
  status?: 'active' | 'suspended' | 'pending';
}
