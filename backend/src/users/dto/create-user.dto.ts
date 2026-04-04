import { IsString, IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  fullName: string;

  @IsEnum(['ADMIN', 'LECTURER', 'STUDENT'])
  role: 'ADMIN' | 'LECTURER' | 'STUDENT';

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
