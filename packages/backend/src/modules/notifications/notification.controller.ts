import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';
import { requireUser } from '../../shared/middleware/auth.middleware.js';
import { buildPagination } from '../../shared/utils/helpers.js';
import { notificationService } from './notification.service.js';

export class NotificationController {
  // Get user notifications
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(
      user.id,
      page,
      limit,
      unreadOnly
    );

    const response: ApiResponse = {
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        pagination: buildPagination(page, limit, result.total),
      },
    };

    res.json(response);
  }

  // Mark notification as read
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    const { id } = req.params;

    await notificationService.markAsRead(id as string, user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Notification marked as read',
    };

    res.json(response);
  }

  // Mark all notifications as read
  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    await notificationService.markAllAsRead(user.id);

    const response: ApiResponse = {
      success: true,
      message: 'All notifications marked as read',
    };

    res.json(response);
  }

  // Delete notification
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    const { id } = req.params;

    await notificationService.deleteNotification(id as string, user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Notification deleted',
    };

    res.json(response);
  }

  // Update notification preferences
  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    await notificationService.updatePreferences(user.id, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Notification preferences updated',
    };

    res.json(response);
  }
}

export const notificationController = new NotificationController();
