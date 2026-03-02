import { IsString, IsEmail, IsOptional, MinLength, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  fullName: string;

  @IsOptional()
  @IsEnum(['ADMIN', 'LECTURER', 'STUDENT'])
  role?: 'ADMIN' | 'LECTURER' | 'STUDENT';

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  department?: string;
}
