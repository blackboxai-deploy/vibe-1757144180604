import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from '../common/database/prisma.service';
import { UsersService } from '../users/users.service';
import { AuditService } from '../audit/audit.service';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  ChangePasswordDto,
  ResetPasswordDto,
  ForgotPasswordDto,
} from './dto';
import {
  AuthResponse,
  JwtPayload,
  TokenPair,
} from './types';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwtSecret: string;
  private readonly jwtRefreshSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly jwtRefreshExpiresIn: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
  ) {
    this.jwtSecret = this.configService.get<string>('JWT_SECRET');
    this.jwtRefreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    this.jwtExpiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
    this.jwtRefreshExpiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    if (!this.jwtSecret || !this.jwtRefreshSecret) {
      throw new Error('JWT secrets are not configured properly');
    }
  }

  /**
   * Register a new user
   */
  async register(registerDto: RegisterDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const { email, password, name, roleId } = registerDto;

    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Hash password
      const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash,
          roleId: roleId || await this.getDefaultRoleId(),
          status: 'ACTIVE',
        },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      // Log security event
      await this.logSecurityEvent('REGISTER_SUCCESS', user.id, email, ipAddress, userAgent);

      // Log audit trail
      await this.auditService.log({
        entity: 'User',
        entityId: user.id,
        action: 'CREATE',
        actorUserId: user.id,
        actorRole: user.role.name,
        afterData: { email, name, roleId: user.roleId },
        ipAddress,
        userAgent,
      });

      // Generate tokens
      const tokens = await this.generateTokenPair(user);

      return {
        user: this.formatUserResponse(user),
        tokens,
        message: 'Registration successful',
      };
    } catch (error) {
      await this.logSecurityEvent('REGISTER_FAILED', null, email, ipAddress, userAgent, error.message);
      throw error;
    }
  }

  /**
   * Login user with email and password
   */
  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string): Promise<AuthResponse> {
    const { email, password } = loginDto;

    try {
      // Find user with role and permissions
      const user = await this.prisma.user.findUnique({
        where: { email },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        await this.logSecurityEvent('LOGIN_FAILED', null, email, ipAddress, userAgent, 'User not found');
        throw new UnauthorizedException('Invalid credentials');
      }

      // Check user status
      if (user.status !== 'ACTIVE') {
        await this.logSecurityEvent('LOGIN_FAILED', user.id, email, ipAddress, userAgent, 'Account inactive');
        throw new UnauthorizedException('Account is inactive');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        await this.logSecurityEvent('LOGIN_FAILED', user.id, email, ipAddress, userAgent, 'Invalid password');
        throw new UnauthorizedException('Invalid credentials');
      }

      // Update last login timestamp
      await this.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Log successful login
      await this.logSecurityEvent('LOGIN_SUCCESS', user.id, email, ipAddress, userAgent);

      // Generate tokens
      const tokens = await this.generateTokenPair(user);

      return {
        user: this.formatUserResponse(user),
        tokens,
        message: 'Login successful',
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      await this.logSecurityEvent('LOGIN_FAILED', null, email, ipAddress, userAgent, error.message);
      throw new UnauthorizedException('Login failed');
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenPair> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtRefreshSecret,
      }) as JwtPayload;

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        include: {
          role: {
            include: {
              rolePermissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      });

      if (!user || user.status !== 'ACTIVE') {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Generate new token pair
      return await this.generateTokenPair(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Logout user (invalidate tokens)
   */
  async logout(userId: string, ipAddress?: string, userAgent?: string): Promise<{ message: string }> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (user) {
        await this.logSecurityEvent('LOGOUT', userId, user.email, ipAddress, userAgent);
      }

      // In a production system, you would maintain a blacklist of tokens
      // or use Redis to track valid tokens
      
      return { message: 'Logout successful' };
    } catch (error) {
      this.logger.error('Logout error:', error);
      return { message: 'Logout completed' };
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<{ message: string }> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    // Log security event
    await this.logSecurityEvent('PASSWORD_CHANGE', userId, user.email);

    return { message: 'Password changed successfully' };
  }

  /**
   * Request password reset
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists or not
      return { message: 'If the email exists, a reset link has been sent' };
    }

    // Generate reset token
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // Log security event
    await this.logSecurityEvent('PASSWORD_RESET_REQUEST', user.id, email);

    // TODO: Send email with reset link
    // await this.emailService.sendPasswordResetEmail(user.email, resetToken);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const saltRounds = this.configService.get<number>('BCRYPT_ROUNDS', 12);
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Log security event
    await this.logSecurityEvent('PASSWORD_RESET_SUCCESS', user.id, user.email);

    return { message: 'Password reset successful' };
  }

  /**
   * Validate user for strategies
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (user && user.status === 'ACTIVE') {
      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (isPasswordValid) {
        const { passwordHash, ...result } = user;
        return result;
      }
    }
    return null;
  }

  /**
   * Generate JWT token pair
   */
  private async generateTokenPair(user: any): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name,
      permissions: user.role.rolePermissions.map((rp) => rp.permission.key),
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.jwtSecret,
      expiresIn: this.jwtExpiresIn,
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.jwtRefreshSecret,
        expiresIn: this.jwtRefreshExpiresIn,
      }
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: this.jwtExpiresIn,
    };
  }

  /**
   * Format user response (remove sensitive data)
   */
  private formatUserResponse(user: any) {
    const { passwordHash, passwordResetToken, passwordResetExpires, ...userResponse } = user;
    return {
      ...userResponse,
      permissions: user.role?.rolePermissions?.map((rp) => rp.permission.key) || [],
    };
  }

  /**
   * Get default role ID for registration
   */
  private async getDefaultRoleId(): Promise<string> {
    const defaultRole = await this.prisma.role.findFirst({
      where: { name: 'Subordinate' },
    });
    
    if (!defaultRole) {
      throw new Error('Default role not found');
    }
    
    return defaultRole.id;
  }

  /**
   * Log security events
   */
  private async logSecurityEvent(
    event: string,
    userId?: string,
    email?: string,
    ipAddress?: string,
    userAgent?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      await this.prisma.securityLog.create({
        data: {
          userId,
          event: event as any, // Cast to enum
          email,
          ipAddress,
          userAgent,
          success: !errorMessage,
          errorMessage,
          metadata: errorMessage ? { error: errorMessage } : null,
        },
      });
    } catch (error) {
      this.logger.error('Failed to log security event:', error);
    }
  }
}