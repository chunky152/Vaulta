import { User, UserRole } from '@prisma/client';
import { prisma } from '../config/database.js';
import { cache } from '../config/redis.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import {
  generateTokens,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt.js';
import {
  generateReferralCode,
  sanitizeUser,
} from '../utils/helpers.js';
import {
  AuthTokens,
  ConflictError,
  NotFoundError,
  AuthenticationError,
  ValidationError,
} from '../types/index.js';
import { RegisterInput, LoginInput } from '../validators/auth.validator.js';

export class AuthService {
  // Register a new user
  async register(input: RegisterInput): Promise<{ user: Omit<User, 'passwordHash'>; tokens: AuthTokens }> {
    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email is already registered');
    }

    // Check referral code if provided
    let referredBy: User | null = null;
    if (input.referralCode) {
      referredBy = await prisma.user.findUnique({
        where: { referralCode: input.referralCode },
      });

      if (!referredBy) {
        throw new ValidationError('Invalid referral code');
      }
    }

    // Hash password
    const passwordHash = await hashPassword(input.password);

    // Generate unique referral code
    let referralCode: string;
    let attempts = 0;
    do {
      referralCode = generateReferralCode();
      const exists = await prisma.user.findUnique({
        where: { referralCode },
      });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        referralCode,
        referredById: referredBy?.id,
        loyaltyPoints: referredBy ? 100 : 0, // Bonus points for referral
      },
    });

    // Award referral bonus to referrer
    if (referredBy) {
      await prisma.$transaction([
        prisma.user.update({
          where: { id: referredBy.id },
          data: { loyaltyPoints: { increment: 200 } },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            userId: referredBy.id,
            points: 200,
            type: 'EARNED',
            source: 'REFERRAL',
            referenceId: user.id,
            description: `Referral bonus for inviting ${user.email}`,
          },
        }),
        prisma.loyaltyTransaction.create({
          data: {
            userId: user.id,
            points: 100,
            type: 'BONUS',
            source: 'SIGNUP',
            description: 'Welcome bonus for using referral code',
          },
        }),
      ]);
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: getRefreshTokenExpiry(),
      },
    });

    return {
      user: sanitizeUser(user),
      tokens,
    };
  }

  // Login user
  async login(input: LoginInput): Promise<{ user: Omit<User, 'passwordHash'>; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new AuthenticationError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new AuthenticationError('Your account has been suspended');
    }

    const isValidPassword = await comparePassword(input.password, user.passwordHash);

    if (!isValidPassword) {
      throw new AuthenticationError('Invalid email or password');
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Save refresh token and update last login
    await prisma.$transaction([
      prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: user.id,
          expiresAt: getRefreshTokenExpiry(),
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return {
      user: sanitizeUser(user),
      tokens,
    };
  }

  // Refresh access token
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    // Verify the refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }

    // Check if token exists in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new AuthenticationError('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      await prisma.refreshToken.delete({
        where: { id: storedToken.id },
      });
      throw new AuthenticationError('Refresh token has expired');
    }

    if (!storedToken.user.isActive) {
      throw new AuthenticationError('Your account has been suspended');
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: storedToken.user.id,
      email: storedToken.user.email,
      role: storedToken.user.role,
    });

    // Rotate refresh token (delete old, create new)
    await prisma.$transaction([
      prisma.refreshToken.delete({
        where: { id: storedToken.id },
      }),
      prisma.refreshToken.create({
        data: {
          token: tokens.refreshToken,
          userId: storedToken.user.id,
          expiresAt: getRefreshTokenExpiry(),
        },
      }),
    ]);

    return tokens;
  }

  // Logout user (invalidate refresh token)
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { token: refreshToken },
    });
  }

  // Logout from all devices
  async logoutAll(userId: string): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  // Get user by ID
  async getUserById(userId: string): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    return sanitizeUser(user);
  }

  // Update user profile
  async updateProfile(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>
  ): Promise<Omit<User, 'passwordHash'>> {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return sanitizeUser(user);
  }

  // Change password
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User');
    }

    const isValidPassword = await comparePassword(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { passwordHash },
      }),
      // Invalidate all refresh tokens
      prisma.refreshToken.deleteMany({
        where: { userId },
      }),
    ]);
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // Generate reset token
    const resetToken = generateReferralCode() + generateReferralCode();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    // Store in Redis
    await cache.set(
      `password_reset:${resetToken}`,
      { userId: user.id, email: user.email },
      3600 // 1 hour TTL
    );

    // TODO: Send email with reset link
    console.log(`Password reset token for ${email}: ${resetToken}`);
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const data = await cache.get<{ userId: string; email: string }>(
      `password_reset:${token}`
    );

    if (!data) {
      throw new ValidationError('Invalid or expired reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: data.userId },
        data: { passwordHash },
      }),
      prisma.refreshToken.deleteMany({
        where: { userId: data.userId },
      }),
    ]);

    // Delete the reset token
    await cache.del(`password_reset:${token}`);
  }

  // Verify email (placeholder - needs email service integration)
  async verifyEmail(token: string): Promise<void> {
    const data = await cache.get<{ userId: string }>(
      `email_verification:${token}`
    );

    if (!data) {
      throw new ValidationError('Invalid or expired verification token');
    }

    await prisma.user.update({
      where: { id: data.userId },
      data: { emailVerified: true },
    });

    await cache.del(`email_verification:${token}`);
  }
}

export const authService = new AuthService();
