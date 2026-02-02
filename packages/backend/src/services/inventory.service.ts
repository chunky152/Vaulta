import { Booking } from '../models/Booking.js';
import { InventoryItem } from '../models/InventoryItem.js';
import mongoose from 'mongoose';
import { NotFoundError, AuthorizationError } from '../types/index.js';
import {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  ListInventoryInput,
} from '../validators/inventory.validator.js';

export class InventoryService {
  // Create a new inventory item
  async createItem(
    userId: string,
    bookingId: string,
    data: CreateInventoryItemInput
  ): Promise<any> {
    // Verify booking exists and belongs to user
    const booking = await Booking.findById(bookingId).select('_id userId status');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.userId.toString() !== userId) {
      throw new AuthorizationError('You do not have access to this booking');
    }

    // Only allow adding items to active or confirmed bookings
    if (!['ACTIVE', 'CONFIRMED'].includes(booking.status)) {
      throw new AuthorizationError(
        'You can only add items to active or confirmed bookings'
      );
    }

    const item = await InventoryItem.create({
      bookingId: new mongoose.Types.ObjectId(bookingId),
      userId: new mongoose.Types.ObjectId(userId),
      name: data.name,
      description: data.description,
      category: data.category,
      quantity: data.quantity ?? 1,
      condition: data.condition ?? 'GOOD',
      estimatedValue: data.estimatedValue,
      photos: data.photos ?? [],
      notes: data.notes,
    });

    // Populate the booking and its related data
    const populatedItem = await item.populate({
      path: 'bookingId',
      populate: {
        path: 'unitId',
        select: 'unitNumber locationId',
        populate: {
          path: 'locationId',
          select: 'name',
        },
      },
    });

    return populatedItem;
  }

  // Update an inventory item
  async updateItem(
    userId: string,
    itemId: string,
    data: UpdateInventoryItemInput
  ): Promise<any> {
    const item = await InventoryItem.findById(itemId).select('_id userId');

    if (!item) {
      throw new NotFoundError('Inventory item');
    }

    if (item.userId.toString() !== userId) {
      throw new AuthorizationError('You do not have access to this item');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category) updateData.category = data.category;
    if (data.quantity) updateData.quantity = data.quantity;
    if (data.condition) updateData.condition = data.condition;
    if (data.estimatedValue !== undefined) updateData.estimatedValue = data.estimatedValue;
    if (data.photos) updateData.photos = data.photos;
    if (data.notes !== undefined) updateData.notes = data.notes;

    const updatedItem = await InventoryItem.findByIdAndUpdate(itemId, updateData, {
      new: true,
    }).populate({
      path: 'booking',
      select: 'bookingNumber unit',
      populate: {
        path: 'unit',
        select: 'unitNumber location',
        populate: {
          path: 'location',
          select: 'name',
        },
      },
    });

    return updatedItem;
  }

  // Delete an inventory item
  async deleteItem(userId: string, itemId: string) {
    const item = await InventoryItem.findById(itemId).select('_id userId');

    if (!item) {
      throw new NotFoundError('Inventory item');
    }

    if (item.userId.toString() !== userId) {
      throw new AuthorizationError('You do not have access to this item');
    }

    await InventoryItem.findByIdAndDelete(itemId);
  }

  // Get a single inventory item
  async getItemById(userId: string, itemId: string): Promise<any> {
    const item = await InventoryItem.findById(itemId).populate({
      path: 'booking',
      select: 'bookingNumber status startTime endTime unit',
      populate: {
        path: 'unit',
        select: 'unitNumber size location',
        populate: {
          path: 'location',
          select: 'name address city',
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Inventory item');
    }

    if (item.userId.toString() !== userId) {
      throw new AuthorizationError('You do not have access to this item');
    }

    return item;
  }

  // List items for a specific booking
  async listBookingItems(
    userId: string,
    bookingId: string,
    params: ListInventoryInput
  ): Promise<any> {
    // Verify booking belongs to user
    const booking = await Booking.findById(bookingId).select('_id userId');

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.userId.toString() !== userId) {
      throw new AuthorizationError('You do not have access to this booking');
    }

    const { page = 1, limit = 20, category, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { bookingId: new mongoose.Types.ObjectId(bookingId) };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      InventoryItem.find(where)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      InventoryItem.countDocuments(where),
    ]);

    return {
      items,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // List all user's inventory items across all bookings
  async listUserInventory(userId: string, params: ListInventoryInput) {
    const { page = 1, limit = 20, category, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { userId: new mongoose.Types.ObjectId(userId) };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      InventoryItem.find(where)
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .populate({
          path: 'booking',
          select: 'bookingNumber status unit',
          populate: {
            path: 'unit',
            select: 'unitNumber location',
            populate: {
              path: 'location',
              select: 'name',
            },
          },
        }),
      InventoryItem.countDocuments(where),
    ]);

    return {
      items,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get inventory summary for user
  async getInventorySummary(userId: string): Promise<any> {
    const userObjectId = new mongoose.Types.ObjectId(userId);
    const [totalItems, totalValueResult, categoryBreakdown] = await Promise.all([
      InventoryItem.countDocuments({ userId: userObjectId }),
      InventoryItem.aggregate([
        { $match: { userId: userObjectId, estimatedValue: { $ne: null } } },
        { $group: { _id: null, total: { $sum: '$estimatedValue' } } },
      ]),
      InventoryItem.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
    ]);

    return {
      totalItems,
      totalEstimatedValue: totalValueResult[0]?.total ?? 0,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c._id,
        count: c.count,
      })),
    };
  }
}

export const inventoryService = new InventoryService();
