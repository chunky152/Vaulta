import { Response } from 'express';
import { UserRole, BookingStatus } from '@unbur/shared';
import { AuthenticatedRequest, ApiResponse } from '../../shared/types/index.js';
import { buildPagination } from '../../shared/utils/helpers.js';
import { TransactionType, TransactionStatus } from '../payments/Transaction.model.js';
import { adminService } from './admin.service.js';

export class AdminController {
  // Get dashboard stats
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const stats = await adminService.getDashboardStats();

    const response: ApiResponse = {
      success: true,
      data: stats,
    };

    res.json(response);
  }

  // Get all bookings (admin)
  async getAllBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const rawStatus = typeof req.query.status === 'string' ? req.query.status : undefined;
    const status =
      rawStatus && (Object.values(BookingStatus) as string[]).includes(rawStatus)
        ? (rawStatus as BookingStatus)
        : undefined;

    const statusQuery = req.query.status;
    const status =
      typeof statusQuery === 'string' &&
      (Object.values(BookingStatus) as string[]).includes(statusQuery)
        ? (statusQuery as BookingStatus)
        : undefined;

    const { bookings, total } = await adminService.getAllBookings({
      page,
      limit,
      status,
      locationId: req.query.locationId as string | undefined,
      userId: req.query.userId as string | undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        bookings,
        pagination: buildPagination(page, limit, total),
      },
    };

    res.json(response);
  }

    const roleQuery = req.query.role;
    const role =
      typeof roleQuery === 'string' && (Object.values(UserRole) as string[]).includes(roleQuery)
        ? (roleQuery as UserRole)
        : undefined;

  // Get all users (admin)
  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
      role,
    const roleQuery = req.query.role;
    const role =
      typeof roleQuery === 'string' && (Object.values(UserRole) as string[]).includes(roleQuery)
        ? (roleQuery as UserRole)
        : undefined;

    const { users, total } = await adminService.getAllUsers({
      page,
      limit,
      role,
      search: req.query.search as string | undefined,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        users,
        pagination: buildPagination(page, limit, total),
      },
    };

    res.json(response);
  }

  // Update user status (admin)
  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { isActive, role } = req.body;

    const user = await adminService.updateUserStatus(id as string, { isActive, role });

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: { user },
    };

    res.json(response);
  }

  // Get occupancy data
  async getOccupancyData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const locations = await adminService.getOccupancyData();

    const response: ApiResponse = {
      success: true,
      data: { locations },
    };

    res.json(response);
  }

  // Get analytics data
  async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string) || 30;

    const analytics = await adminService.getAnalytics(days);

    const response: ApiResponse = {
      success: true,
      data: analytics,
    };

    res.json(response);
  }

  // Get transaction reports
  async getTransactionReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const parsedStartDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const startDate =
      parsedStartDate && !Number.isNaN(parsedStartDate.getTime()) ? parsedStartDate : undefined;

    const parsedEndDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
    const endDate =
      parsedEndDate && !Number.isNaN(parsedEndDate.getTime()) ? parsedEndDate : undefined;

    const rawType = req.query.type;
    const type =
      typeof rawType === 'string' &&
      (Object.values(TransactionType) as string[]).includes(rawType)
        ? (rawType as TransactionType)
        : undefined;

    const rawStatus = req.query.status;
    const status =
      typeof rawStatus === 'string' &&
      (Object.values(TransactionStatus) as string[]).includes(rawStatus)
        ? (rawStatus as TransactionStatus)
        : undefined;

    const { transactions, total, summary } = await adminService.getTransactionReports({
      page,
      limit,
      type,
      status,
      startDate,
      endDate,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        transactions,
        summary,
        pagination: buildPagination(page, limit, total),
      },
    };

    res.json(response);
  }
}

export const adminController = new AdminController();
