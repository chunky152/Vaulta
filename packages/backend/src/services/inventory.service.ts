import { prisma } from '../config/database.js';
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
  ) {
    // Verify booking exists and belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true, status: true },
    });

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.userId !== userId) {
      throw new AuthorizationError('You do not have access to this booking');
    }

    // Only allow adding items to active or confirmed bookings
    if (!['ACTIVE', 'CONFIRMED'].includes(booking.status)) {
      throw new AuthorizationError(
        'You can only add items to active or confirmed bookings'
      );
    }

    const item = await prisma.inventoryItem.create({
      data: {
        bookingId,
        userId,
        name: data.name,
        description: data.description,
        category: data.category,
        quantity: data.quantity ?? 1,
        condition: data.condition ?? 'GOOD',
        estimatedValue: data.estimatedValue,
        photos: data.photos ?? [],
        notes: data.notes,
      },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            unit: {
              select: {
                unitNumber: true,
                location: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return item;
  }

  // Update an inventory item
  async updateItem(
    userId: string,
    itemId: string,
    data: UpdateInventoryItemInput
  ) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: { id: true, userId: true },
    });

    if (!item) {
      throw new NotFoundError('Inventory item');
    }

    if (item.userId !== userId) {
      throw new AuthorizationError('You do not have access to this item');
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id: itemId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.category && { category: data.category }),
        ...(data.quantity && { quantity: data.quantity }),
        ...(data.condition && { condition: data.condition }),
        ...(data.estimatedValue !== undefined && { estimatedValue: data.estimatedValue }),
        ...(data.photos && { photos: data.photos }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            unit: {
              select: {
                unitNumber: true,
                location: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return updatedItem;
  }

  // Delete an inventory item
  async deleteItem(userId: string, itemId: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      select: { id: true, userId: true },
    });

    if (!item) {
      throw new NotFoundError('Inventory item');
    }

    if (item.userId !== userId) {
      throw new AuthorizationError('You do not have access to this item');
    }

    await prisma.inventoryItem.delete({
      where: { id: itemId },
    });
  }

  // Get a single inventory item
  async getItemById(userId: string, itemId: string) {
    const item = await prisma.inventoryItem.findUnique({
      where: { id: itemId },
      include: {
        booking: {
          select: {
            bookingNumber: true,
            status: true,
            startTime: true,
            endTime: true,
            unit: {
              select: {
                unitNumber: true,
                size: true,
                location: {
                  select: {
                    name: true,
                    address: true,
                    city: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!item) {
      throw new NotFoundError('Inventory item');
    }

    if (item.userId !== userId) {
      throw new AuthorizationError('You do not have access to this item');
    }

    return item;
  }

  // List items for a specific booking
  async listBookingItems(
    userId: string,
    bookingId: string,
    params: ListInventoryInput
  ) {
    // Verify booking belongs to user
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { id: true, userId: true },
    });

    if (!booking) {
      throw new NotFoundError('Booking');
    }

    if (booking.userId !== userId) {
      throw new AuthorizationError('You do not have access to this booking');
    }

    const { page = 1, limit = 20, category, search } = params;
    const skip = (page - 1) * limit;

    const where: any = { bookingId };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.inventoryItem.count({ where }),
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

    const where: any = { userId };

    if (category) {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          booking: {
            select: {
              bookingNumber: true,
              status: true,
              unit: {
                select: {
                  unitNumber: true,
                  location: {
                    select: {
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    return {
      items,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get inventory summary for user
  async getInventorySummary(userId: string) {
    const [totalItems, totalValue, categoryBreakdown] = await Promise.all([
      prisma.inventoryItem.count({ where: { userId } }),
      prisma.inventoryItem.aggregate({
        where: { userId, estimatedValue: { not: null } },
        _sum: { estimatedValue: true },
      }),
      prisma.inventoryItem.groupBy({
        by: ['category'],
        where: { userId },
        _count: { id: true },
      }),
    ]);

    return {
      totalItems,
      totalEstimatedValue: totalValue._sum.estimatedValue ?? 0,
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count.id,
      })),
    };
  }
}

export const inventoryService = new InventoryService();
