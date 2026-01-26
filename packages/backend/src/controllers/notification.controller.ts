import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { notificationService } from '../services/notification.service.js';

export class NotificationController {
  // Get user notifications
  async getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unreadOnly === 'true';

    const result = await notificationService.getUserNotifications(
      req.user.id,
      page,
      limit,
      unreadOnly
    );

    const response: ApiResponse = {
      success: true,
      data: {
        notifications: result.notifications,
        unreadCount: result.unreadCount,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasNext: page < Math.ceil(result.total / limit),
          hasPrev: page > 1,
        },
      },
    };

    res.json(response);
  }

  // Mark notification as read
  async markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    await notificationService.markAsRead(id as string, req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Notification marked as read',
    };

    res.json(response);
  }

  // Mark all notifications as read
  async markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await notificationService.markAllAsRead(req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'All notifications marked as read',
    };

    res.json(response);
  }

  // Delete notification
  async deleteNotification(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    await notificationService.deleteNotification(id as string, req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Notification deleted',
    };

    res.json(response);
  }

  // Update notification preferences
  async updatePreferences(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    await notificationService.updatePreferences(req.user.id, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Notification preferences updated',
    };

    res.json(response);
  }
}

export const notificationController = new NotificationController();
