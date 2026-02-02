import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse } from '../types/index.js';
import { Booking, BookingStatus } from '../models/Booking.js';
import { User, UserRole } from '../models/User.js';
import { StorageUnit } from '../models/StorageUnit.js';
import { StorageLocation } from '../models/StorageLocation.js';
import { Transaction } from '../models/Transaction.js';

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
      totalUnits,
      occupiedUnits,
      totalLocations,
    ] = await Promise.all([
      User.countDocuments({ role: 'CUSTOMER' }),
      User.countDocuments({
        role: 'CUSTOMER',
        createdAt: { $gte: startOfMonth },
      }),
      Booking.countDocuments(),
      Booking.countDocuments({
        status: 'ACTIVE',
      }),
      Booking.countDocuments({
        status: 'COMPLETED',
      }),
      StorageUnit.countDocuments({ isActive: true }),
      StorageUnit.countDocuments({
        isActive: true,
        status: 'OCCUPIED',
      }),
      StorageLocation.countDocuments({ isActive: true }),
    ]);

    // Get revenue aggregation
    const revenueData = await Transaction.aggregate([
      {
        $match: {
          type: 'PAYMENT',
          status: 'COMPLETED',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const revenueThisMonthData = await Transaction.aggregate([
      {
        $match: {
          type: 'PAYMENT',
          status: 'COMPLETED',
          createdAt: { $gte: startOfMonth },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ]);

    const totalRevenue = revenueData.length > 0 ? revenueData[0].total : 0;
    const revenueThisMonth = revenueThisMonthData.length > 0 ? revenueThisMonthData[0].total : 0;

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
          total: totalRevenue,
          thisMonth: revenueThisMonth,
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
    if (locationId) where.unitId = { $in: [new (Booking as any).schema.types.ObjectId(locationId)] };
    if (userId) where.userId = userId;

    const [bookings, total] = await Promise.all([
      Booking.find(where)
        .populate({
          path: 'userId',
          select: 'id email firstName lastName',
        })
        .populate({
          path: 'unitId',
          populate: {
            path: 'locationId',
            select: 'id name city',
          },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(where),
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
      where.$or = [
        { email: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(where)
        .select('id email firstName lastName phone role emailVerified phoneVerified loyaltyPoints isActive lastLoginAt createdAt')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      User.countDocuments(where),
    ]);

    // Add booking count for each user
    const usersWithCount = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ userId: user._id });
        return {
          ...user.toObject(),
          _count: {
            bookings: bookingCount,
          },
        };
      })
    );

    const response: ApiResponse = {
      success: true,
      data: {
        users: usersWithCount,
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

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).select('id email firstName lastName role isActive');

    const response: ApiResponse = {
      success: true,
      message: 'User updated successfully',
      data: { user },
    };

    res.json(response);
  }

  // Get occupancy data
  async getOccupancyData(req: AuthenticatedRequest, res: Response): Promise<void> {
    const locations = await StorageLocation.find({
      isActive: true,
    }).populate({
      path: 'units',
      match: { isActive: true },
      select: 'status',
    });

    const occupancyData = locations.map((location) => {
      const units = (location as any).units || [];
      const totalUnits = units.length;
      const occupiedUnits = units.filter(
        (u: any) => u.status === 'OCCUPIED'
      ).length;
      const availableUnits = units.filter(
        (u: any) => u.status === 'AVAILABLE'
      ).length;

      return {
        id: location._id,
        name: (location as any).name,
        city: (location as any).city,
        latitude: (location as any).latitude,
        longitude: (location as any).longitude,
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

    // Daily bookings aggregation
    const bookings = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Daily revenue aggregation
    const revenue = await Transaction.aggregate([
      {
        $match: {
          type: 'PAYMENT',
          status: 'COMPLETED',
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Popular locations
    const popularLocations = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$unitId',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Get unit and location details
    const unitIds = popularLocations.map((p: any) => p._id);
    const units = await StorageUnit.find({
      _id: { $in: unitIds },
    }).populate({
      path: 'locationId',
      select: 'id name city',
    });

    const popularLocationsData = popularLocations.map((p: any) => {
      const unit = units.find((u: any) => u._id.toString() === p._id.toString());
      return {
        locationId: (unit as any)?.locationId?._id,
        locationName: (unit as any)?.locationId?.name,
        city: (unit as any)?.locationId?.city,
        bookingCount: p.count,
      };
    });

    // Booking status distribution
    const statusDistribution = await Booking.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

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
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }

    const [transactions, total, summaryData] = await Promise.all([
      Transaction.find(where)
        .populate({
          path: 'userId',
          select: 'email firstName lastName',
        })
        .populate({
          path: 'bookingId',
          select: 'bookingNumber',
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(where),
      Transaction.aggregate([
        {
          $match: { ...where, type: 'PAYMENT', status: 'COMPLETED' },
        },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryData.length > 0 ? summaryData[0] : { totalRevenue: 0, count: 0 };

    const response: ApiResponse = {
      success: true,
      data: {
        transactions,
        summary: {
          totalRevenue: summary.totalRevenue,
          transactionCount: summary.count,
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
