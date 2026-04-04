import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ChangePasswordDto, DeleteProfileDto, UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'active') {
      throw new UnauthorizedException('Account is not active');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
        avatar: user.avatar,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        email: registerDto.email,
        password: hashedPassword,
        fullName: registerDto.fullName,
        role: registerDto.role || 'STUDENT',
        studentId: registerDto.studentId,
        department: registerDto.department,
      },
    });

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        studentId: user.studentId,
        department: user.department,
      },
    };
  }

  async validateUser(userId: string) {
    return this.prisma.user.findFirst({
      where: {
        id: userId,
        status: 'active',
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        department: true,
        avatar: true,
        status: true,
      },
    });
  }

  async getProfile(userId: string) {
    const user = await this.validateUser(userId);
    if (!user) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return user;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const emailInUse = await this.prisma.user.findUnique({
        where: { email: updateProfileDto.email },
      });
      if (emailInUse) {
        throw new ConflictException('Email already exists');
      }
    }

    const data: any = {
      email: updateProfileDto.email,
      fullName: updateProfileDto.fullName,
      department: updateProfileDto.department,
    };

    if (user.role === 'STUDENT') {
      data.studentId = updateProfileDto.studentId;
    }

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        studentId: true,
        department: true,
        avatar: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, status: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const isCurrentPasswordValid = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const isSameAsCurrent = await bcrypt.compare(changePasswordDto.newPassword, user.password);
    if (isSameAsCurrent) {
      throw new ConflictException('New password must be different from current password');
    }

    const newHashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return { message: 'Password updated successfully' };
  }

  async deleteProfile(userId: string, deleteProfileDto: DeleteProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, status: true },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('User not found or inactive');
    }

    const isCurrentPasswordValid = await bcrypt.compare(deleteProfileDto.currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: 'deleted' },
    });

    return { message: 'Profile deleted successfully' };
  }
}
