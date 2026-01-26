import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { prisma } from '../config/database.js';
import { BookingStatus, UserRole } from '@prisma/client';

export class AdminController {
  // Get dashboard stats
  async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalUsers,
      newUsersThisMonth,
      totalBookings,
      activeBookings,
      completedBookings,
      totalRevenue,
      revenueThisMonth,
      totalLocations,
      totalUnits,
      occupiedUnits,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.user.count({
        where: {
          role: 'CUSTOMER',
          createdAt: { gte: startOfMonth },
        },
      }),
      prisma.booking.count(),
      prisma.booking.count({
        where: { status: 'ACTIVE' },
      }),
      prisma.booking.count({
        where: { status: 'COMPLETED' },
      }),
      prisma.transaction.aggregate({
        where: { type: 'PAYMENT', status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: {
          type: 'PAYMENT',
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      prisma.storageLocation.count({ where: { isActive: true } }),
      prisma.storageUnit.count({ where: { isActive: true } }),
      prisma.storageUnit.count({
        where: { isActive: true, status: 'OCCUPIED' },
      }),
    ]);

    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    const response: ApiResponse = {
      success: true,
      data: {
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
        },
        bookings: {
          total: totalBookings,
          active: activeBookings,
          completed: completedBookings,
        },
        revenue: {
          total: totalRevenue._sum.amount ?? 0,
          thisMonth: revenueThisMonth._sum.amount ?? 0,
        },
        locations: {
          total: totalLocations,
        },
        units: {
          total: totalUnits,
          occupied: occupiedUnits,
          occupancyRate: Math.round(occupancyRate * 100) / 100,
        },
      },
    };

    res.json(response);
  }

  // Get all bookings (admin)
  async getAllBookings(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as BookingStatus | undefined;
    const locationId = req.query.locationId as string | undefined;
    const userId = req.query.userId as string | undefined;

    const where: any = {};
    if (status) where.status = status;
    if (locationId) where.unit = { locationId };
    if (userId) where.userId = userId;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          unit: {
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    res.json(response);
  }

  // Get all users (admin)
  async getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const role = req.query.role as UserRole | undefined;
    const search = req.query.search as string | undefined;

    const where: any = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          emailVerified: true,
          phoneVerified: true,
          loyaltyPoints: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          _count: {
            select: { bookings: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    res.json(response);
  }

  // Update user status (admin)
  async updateUserStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { isActive, role } = req.body;

    const updateData: any = {};
    if (isActive !== undefined) updateData.isActive = isActive;
    if (role) updateData.role = role;

    const user = await prisma.user.update({
      where: { id: id as string },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
      },
    });

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: { user },
    };

    res.json(response);
  }

  // Get occupancy data
  async getOccupancyData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const locations = await prisma.storageLocation.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        latitude: true,
        longitude: true,
        units: {
          where: { isActive: true },
          select: {
            status: true,
          },
        },
      },
    });

    const occupancyData = locations.map((location) => {
      const totalUnits = location.units.length;
      const occupiedUnits = location.units.filter(
        (u) => u.status === 'OCCUPIED'
      ).length;
      const availableUnits = location.units.filter(
        (u) => u.status === 'AVAILABLE'
      ).length;

      return {
        id: location.id,
        name: location.name,
        city: location.city,
        latitude: location.latitude,
        longitude: location.longitude,
        totalUnits,
        occupiedUnits,
        availableUnits,
        occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
      };
    });

    const response: ApiResponse = {
      success: true,
      data: { locations: occupancyData },
    };

    res.json(response);
  }

  // Get analytics data
  async getAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Daily bookings
    const bookings = await prisma.booking.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    // Daily revenue
    const revenue = await prisma.transaction.groupBy({
      by: ['createdAt'],
      where: {
        type: 'PAYMENT',
        status: 'COMPLETED',
        createdAt: { gte: startDate },
      },
      _sum: { amount: true },
    });

    // Popular locations
    const popularLocations = await prisma.booking.groupBy({
      by: ['unitId'],
      where: {
        createdAt: { gte: startDate },
      },
      _count: true,
      orderBy: { _count: { unitId: 'desc' } },
      take: 10,
    });

    // Get location details for popular bookings
    const unitIds = popularLocations.map((p) => p.unitId);
    const units = await prisma.storageUnit.findMany({
      where: { id: { in: unitIds } },
      include: {
        location: {
          select: { id: true, name: true, city: true },
        },
      },
    });

    const popularLocationsData = popularLocations.map((p) => {
      const unit = units.find((u) => u.id === p.unitId);
      return {
        locationId: unit?.location?.id,
        locationName: unit?.location?.name,
        city: unit?.location?.city,
        bookingCount: p._count,
      };
    });

    // Booking status distribution
    const statusDistribution = await prisma.booking.groupBy({
      by: ['status'],
      _count: true,
    });

    const response: ApiResponse = {
      success: true,
      data: {
        period: { days, startDate },
        dailyBookings: bookings,
        dailyRevenue: revenue,
        popularLocations: popularLocationsData,
        statusDistribution,
      },
    };

    res.json(response);
  }

  // Get transaction reports
  async getTransactionReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const startDate = req.query.startDate
      ? new Date(req.query.startDate as string)
      : undefined;
    const endDate = req.query.endDate
      ? new Date(req.query.endDate as string)
      : undefined;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [transactions, total, summary] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          user: {
            select: { email: true, firstName: true, lastName: true },
          },
          booking: {
            select: { bookingNumber: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where: { ...where, type: 'PAYMENT', status: 'COMPLETED' },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const response: ApiResponse = {
      success: true,
      data: {
        transactions,
        summary: {
          totalRevenue: summary._sum.amount ?? 0,
          transactionCount: summary._count,
        },
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    };

    res.json(response);
  }
}

export const adminController = new AdminController();
