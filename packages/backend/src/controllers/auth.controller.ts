import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { authService } from '../services/auth.service.js';
import {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
  UpdateProfileInput,
} from '../validators/auth.validator.js';

export class AuthController {
  // Register a new user
  async register(
    req: AuthenticatedRequest & { body: RegisterInput },
    res: Response
  ): Promise<void> {
    const result = await authService.register(req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Registration successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    };

    res.status(201).json(response);
  }

  // Login user
  async login(
    req: AuthenticatedRequest & { body: LoginInput },
    res: Response
  ): Promise<void> {
    const result = await authService.login(req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        tokens: result.tokens,
      },
    };

    res.json(response);
  }

  // Refresh access token
  async refreshToken(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshToken(refreshToken);

    const response: ApiResponse = {
      success: true,
      data: { tokens },
    };

    res.json(response);
  }

  // Logout user
  async logout(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { refreshToken } = req.body;

    await authService.logout(refreshToken);

    const response: ApiResponse = {
      success: true,
      message: 'Logout successful',
    };

    res.json(response);
  }

  // Logout from all devices
  async logoutAll(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await authService.logoutAll(req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Logged out from all devices',
    };

    res.json(response);
  }

  // Get current user profile
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await authService.getUserById(req.user.id);

    const response: ApiResponse = {
      success: true,
      data: { user },
    };

    res.json(response);
  }

  // Update user profile
  async updateProfile(
    req: AuthenticatedRequest & { body: UpdateProfileInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await authService.updateProfile(req.user.id, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Profile updated successfully',
      data: { user },
    };

    res.json(response);
  }

  // Change password
  async changePassword(
    req: AuthenticatedRequest & { body: ChangePasswordInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await authService.changePassword(
      req.user.id,
      req.body.currentPassword,
      req.body.newPassword
    );

    const response: ApiResponse = {
      success: true,
      message: 'Password changed successfully. Please log in again.',
    };

    res.json(response);
  }

  // Request password reset
  async forgotPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { email } = req.body;

    await authService.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    const response: ApiResponse = {
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.',
    };

    res.json(response);
  }

  // Reset password
  async resetPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { token, password } = req.body;

    await authService.resetPassword(token, password);

    const response: ApiResponse = {
      success: true,
      message: 'Password has been reset successfully. Please log in.',
    };

    res.json(response);
  }

  // Verify email
  async verifyEmail(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { token } = req.body;

    await authService.verifyEmail(token);

    const response: ApiResponse = {
      success: true,
      message: 'Email verified successfully',
    };

    res.json(response);
  }
}

export const authController = new AuthController();
