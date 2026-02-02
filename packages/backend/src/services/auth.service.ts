import { User, UserRole } from '../models/User.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { LoyaltyTransaction } from '../models/LoyaltyTransaction.js';
import mongoose from 'mongoose';

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
  async register(input: RegisterInput): Promise<{ user: any; tokens: AuthTokens }> {
    // Check if email already exists
    const existingUser = await User.findOne({ email: input.email });

    if (existingUser) {
      throw new ConflictError('Email is already registered');
    }

    // Check referral code if provided
    let referredBy: any = null;
    if (input.referralCode) {
      referredBy = await User.findOne({ referralCode: input.referralCode });

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
      const exists = await User.findOne({ referralCode });
      if (!exists) break;
      attempts++;
    } while (attempts < 10);

    // Create user
    const user = await User.create({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      referralCode,
      referredById: referredBy?._id,
      loyaltyPoints: referredBy ? 100 : 0, // Bonus points for referral
    });

    // Award referral bonus to referrer
    if (referredBy) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        await User.updateOne(
          { _id: referredBy._id },
          { $inc: { loyaltyPoints: 200 } },
          { session }
        );
        await LoyaltyTransaction.create([
          {
            userId: referredBy._id,
            points: 200,
            type: 'EARNED',
            source: 'REFERRAL',
            referenceId: user._id,
            description: `Referral bonus for inviting ${user.email}`,
          },
          {
            userId: user._id,
            points: 100,
            type: 'BONUS',
            source: 'SIGNUP',
            description: 'Welcome bonus for using referral code',
          },
        ], { session });
        await session.commitTransaction();
      } catch (error) {
        await session.abortTransaction();
        throw error;
      } finally {
        await session.endSession();
      }
    }

    // Generate tokens
    const tokens = generateTokens({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token
    await RefreshToken.create({
      token: tokens.refreshToken,
      userId: user._id,
      expiresAt: getRefreshTokenExpiry(),
    });

    return {
      user: sanitizeUser(user),
      tokens,
    };
  }

  // Login user
  async login(input: LoginInput): Promise<{ user: any; tokens: AuthTokens }> {
    const user = await User.findOne({ email: input.email });

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
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    // Save refresh token and update last login
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await RefreshToken.create([{
        token: tokens.refreshToken,
        userId: user._id,
        expiresAt: getRefreshTokenExpiry(),
      }], { session });
      await User.updateOne(
        { _id: user._id },
        { lastLoginAt: new Date() },
        { session }
      );
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

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
    const storedToken = await RefreshToken.findOne({ token: refreshToken }).populate('userId');

    if (!storedToken) {
      throw new AuthenticationError('Refresh token not found');
    }

    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      throw new AuthenticationError('Refresh token has expired');
    }

    if (!(storedToken.userId as any).isActive) {
      throw new AuthenticationError('Your account has been suspended');
    }

    // Generate new tokens
    const tokens = generateTokens({
      userId: (storedToken.userId as any)._id.toString(),
      email: (storedToken.userId as any).email,
      role: (storedToken.userId as any).role,
    });

    // Rotate refresh token (delete old, create new)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await RefreshToken.deleteOne({ _id: storedToken._id }, { session });
      await RefreshToken.create([{
        token: tokens.refreshToken,
        userId: (storedToken.userId as any)._id,
        expiresAt: getRefreshTokenExpiry(),
      }], { session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }

    return tokens;
  }

  // Logout user (invalidate refresh token)
  async logout(refreshToken: string): Promise<void> {
    await RefreshToken.deleteMany({ token: refreshToken });
  }

  // Logout from all devices
  async logoutAll(userId: string): Promise<void> {
    const objectId = new mongoose.Types.ObjectId(userId);
    await RefreshToken.deleteMany({ userId: objectId });
  }

  // Get user by ID
  async getUserById(userId: string): Promise<any> {
    const objectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(objectId);

    if (!user) {
      throw new NotFoundError('User');
    }

    return sanitizeUser(user);
  }

  // Update user profile
  async updateProfile(
    userId: string,
    data: Partial<Pick<any, 'firstName' | 'lastName' | 'phone'>>
  ): Promise<any> {
    const objectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findByIdAndUpdate(objectId, data, { new: true });

    if (!user) {
      throw new NotFoundError('User');
    }

    return sanitizeUser(user);
  }

  // Change password
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    const objectId = new mongoose.Types.ObjectId(userId);
    const user = await User.findById(objectId);

    if (!user) {
      throw new NotFoundError('User');
    }

    const isValidPassword = await comparePassword(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      throw new AuthenticationError('Current password is incorrect');
    }

    const passwordHash = await hashPassword(newPassword);

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await User.updateOne(
        { _id: objectId },
        { passwordHash },
        { session }
      );
      // Invalidate all refresh tokens
      await RefreshToken.deleteMany({ userId: objectId }, { session });
      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      await session.endSession();
    }
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists
      return;
    }

    // TODO: Implement password reset with email service
    console.log(`Password reset requested for ${email}`);
  }

  // Reset password
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // TODO: Implement password reset token validation
    throw new ValidationError('Password reset functionality requires email service integration');
  }

  // Verify email (placeholder - needs email service integration)
  async verifyEmail(token: string): Promise<void> {
    // TODO: Implement email verification token validation
    throw new ValidationError('Email verification functionality requires email service integration');
  }
}

export const authService = new AuthService();
