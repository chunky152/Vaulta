import mongoose, { FilterQuery } from 'mongoose';
import { UserRole, BookingStatus, UnitStatus } from '@unbur/shared';
import { Booking, IBooking } from '../bookings/Booking.model.js';
import { User, IUser } from '../auth/User.model.js';
import { StorageUnit } from '../units/StorageUnit.model.js';
import { StorageLocation } from '../locations/StorageLocation.model.js';
import {
  Transaction,
  ITransaction,
  TransactionType,
  TransactionStatus,
} from '../payments/Transaction.model.js';
import { NotFoundError } from '../../shared/types/index.js';

export interface AdminDashboardStats {
  users: { total: number; newThisMonth: number };
  bookings: { total: number; active: number; completed: number };
  revenue: { total: number; thisMonth: number };
  locations: { total: number };
  units: { total: number; occupied: number; occupancyRate: number };
}

export interface AdminBookingListParams {
  page: number;
  limit: number;
  status?: BookingStatus;
  locationId?: string;
  userId?: string;
}

export interface AdminUserListParams {
  page: number;
  limit: number;
  role?: UserRole;
  search?: string;
}

export interface AdminOccupancyLocation {
  id: mongoose.Types.ObjectId;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  totalUnits: number;
  occupiedUnits: number;
  availableUnits: number;
  occupancyRate: number;
}

export interface AdminTransactionReportParams {
  page: number;
  limit: number;
  type?: TransactionType;
  status?: TransactionStatus;
  startDate?: Date;
  endDate?: Date;
}

export class AdminService {
  // Get dashboard stats
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
      User.countDocuments({ role: UserRole.CUSTOMER }),
      User.countDocuments({
        role: UserRole.CUSTOMER,
        createdAt: { $gte: startOfMonth },
      }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: BookingStatus.ACTIVE }),
      Booking.countDocuments({ status: BookingStatus.COMPLETED }),
      StorageUnit.countDocuments({ isActive: true }),
      StorageUnit.countDocuments({ isActive: true, status: UnitStatus.OCCUPIED }),
      StorageLocation.countDocuments({ isActive: true }),
    ]);

    const [revenueData, revenueThisMonthData] = await Promise.all([
      Transaction.aggregate<{ _id: null; total: number }>([
        { $match: { type: TransactionType.PAYMENT, status: TransactionStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate<{ _id: null; total: number }>([
        {
          $match: {
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            createdAt: { $gte: startOfMonth },
          },
        },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    const totalRevenue = revenueData[0]?.total ?? 0;
    const revenueThisMonth = revenueThisMonthData[0]?.total ?? 0;
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    return {
      users: { total: totalUsers, newThisMonth: newUsersThisMonth },
      bookings: { total: totalBookings, active: activeBookings, completed: completedBookings },
      revenue: { total: totalRevenue, thisMonth: revenueThisMonth },
      locations: { total: totalLocations },
      units: {
        total: totalUnits,
        occupied: occupiedUnits,
        occupancyRate: Math.round(occupancyRate * 100) / 100,
      },
    };
  }

  // Get all bookings (admin)
  async getAllBookings(
    params: AdminBookingListParams
  ): Promise<{ bookings: IBooking[]; total: number }> {
    const { page, limit, status, locationId, userId } = params;

    const where: FilterQuery<IBooking> = {};
    if (status) where.status = status;
    if (userId) where.userId = new mongoose.Types.ObjectId(userId);
    if (locationId) {
      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        where.unitId = { $in: [] };
      } else {
        const normalizedLocationId = new mongoose.Types.ObjectId(locationId);
        const unitIds = await StorageUnit.find({ locationId: normalizedLocationId }).distinct('_id');
        where.unitId = { $in: unitIds };
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(where)
        .populate({ path: 'userId', select: 'id email firstName lastName' })
        .populate({
          path: 'unitId',
          populate: { path: 'locationId', select: 'id name city' },
        })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(where),
    ]);

    return { bookings, total };
  }

  // Get all users (admin)
  async getAllUsers(
    params: AdminUserListParams
  ): Promise<{ users: (IUser & { _count: { bookings: number } })[]; total: number }> {
    const { page, limit, role, search } = params;

    const where: FilterQuery<IUser> = {};
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

    const usersWithCount = await Promise.all(
      users.map(async (user) => {
        const bookingCount = await Booking.countDocuments({ userId: user._id });
        return Object.assign(user.toObject(), { _count: { bookings: bookingCount } });
      })
    );

    return { users: usersWithCount, total };
  }

  // Update user status/role (admin)
  async updateUserStatus(
    id: string,
    input: { isActive?: boolean; role?: UserRole }
  ): Promise<IUser> {
    const updateData: Partial<Pick<IUser, 'isActive' | 'role'>> = {};
    if (input.isActive !== undefined) updateData.isActive = input.isActive;
    if (input.role) updateData.role = input.role;

    const user = await User.findByIdAndUpdate(id, updateData, { new: true }).select(
      'id email firstName lastName role isActive'
    );

    if (!user) {
      throw new NotFoundError('User');
    }

    return user;
  }

  // Get occupancy data per location
  async getOccupancyData(): Promise<AdminOccupancyLocation[]> {
    const locations = await StorageLocation.find({ isActive: true });

    return Promise.all(
      locations.map(async (location) => {
        const units = await StorageUnit.find({
          locationId: location._id,
          isActive: true,
        }).select('status');

        const totalUnits = units.length;
        const occupiedUnits = units.filter((u) => u.status === UnitStatus.OCCUPIED).length;
        const availableUnits = units.filter((u) => u.status === UnitStatus.AVAILABLE).length;

        return {
          id: location._id as mongoose.Types.ObjectId,
          name: location.name,
          city: location.city,
          latitude: location.latitude,
          longitude: location.longitude,
          totalUnits,
          occupiedUnits,
          availableUnits,
          occupancyRate: totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0,
        };
      })
    );
  }

  // Get analytics data
  async getAnalytics(days: number) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [bookings, revenue, popularLocations, statusDistribution] = await Promise.all([
      Booking.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: startDate } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Transaction.aggregate<{ _id: string; total: number }>([
        {
          $match: {
            type: TransactionType.PAYMENT,
            status: TransactionStatus.COMPLETED,
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Booking.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: '$unitId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Booking.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    const unitIds = popularLocations.map((p) => p._id);
    const units = await StorageUnit.find({ _id: { $in: unitIds } }).populate({
      path: 'locationId',
      select: 'id name city',
    });

    const popularLocationsData = popularLocations.map((p) => {
      const unit = units.find((u) => u._id.toString() === p._id.toString());
      const location = unit?.locationId as unknown as
        | { _id: mongoose.Types.ObjectId; name: string; city: string }
        | undefined;
      return {
        locationId: location?._id,
        locationName: location?.name,
        city: location?.city,
        bookingCount: p.count,
      };
    });

    return {
      period: { days, startDate },
      dailyBookings: bookings,
      dailyRevenue: revenue,
      popularLocations: popularLocationsData,
      statusDistribution,
    };
  }

  // Get transaction reports
  async getTransactionReports(params: AdminTransactionReportParams): Promise<{
    transactions: ITransaction[];
    total: number;
    summary: { totalRevenue: number; transactionCount: number };
  }> {
    const { page, limit, type, status, startDate, endDate } = params;

    const where: FilterQuery<ITransaction> = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }

    const [transactions, total, summaryData] = await Promise.all([
      Transaction.find(where)
        .populate({ path: 'userId', select: 'email firstName lastName' })
        .populate({ path: 'bookingId', select: 'bookingNumber' })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Transaction.countDocuments(where),
      Transaction.aggregate<{ _id: null; totalRevenue: number; count: number }>([
        { $match: { ...where, type: TransactionType.PAYMENT, status: TransactionStatus.COMPLETED } },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$amount' },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const summary = summaryData[0] ?? { totalRevenue: 0, count: 0 };

    return {
      transactions,
      total,
      summary: {
        totalRevenue: summary.totalRevenue,
        transactionCount: summary.count,
      },
    };
  }
}

export const adminService = new AdminService();
