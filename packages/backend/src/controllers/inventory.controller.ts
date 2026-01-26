import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse } from '../types/index.js';
import { inventoryService } from '../services/inventory.service.js';
import {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  ListInventoryInput,
} from '../validators/inventory.validator.js';

export class InventoryController {
  // Add item to a booking
  async addItem(
    req: AuthenticatedRequest & { body: CreateInventoryItemInput; params: { bookingId: string } },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { bookingId } = req.params;
    const item = await inventoryService.createItem(req.user.id, bookingId, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Item added to inventory',
      data: { item },
    };

    res.status(201).json(response);
  }

  // Get items for a specific booking
  async getBookingItems(
    req: AuthenticatedRequest & { params: { bookingId: string }; query: ListInventoryInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { bookingId } = req.params;
    const result = await inventoryService.listBookingItems(
      req.user.id,
      bookingId,
      req.query
    );

    const response: PaginatedResponse<(typeof result.items)[0]> = {
      success: true,
      data: result.items,
      pagination: {
        page: req.query.page ?? 1,
        limit: req.query.limit ?? 20,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: (req.query.page ?? 1) < result.totalPages,
        hasPrev: (req.query.page ?? 1) > 1,
      },
    };

    res.json(response);
  }

  // Get all user's inventory items
  async getAllItems(
    req: AuthenticatedRequest & { query: ListInventoryInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const result = await inventoryService.listUserInventory(req.user.id, req.query);

    const response: PaginatedResponse<(typeof result.items)[0]> = {
      success: true,
      data: result.items,
      pagination: {
        page: req.query.page ?? 1,
        limit: req.query.limit ?? 20,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: (req.query.page ?? 1) < result.totalPages,
        hasPrev: (req.query.page ?? 1) > 1,
      },
    };

    res.json(response);
  }

  // Get inventory summary
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const summary = await inventoryService.getInventorySummary(req.user.id);

    const response: ApiResponse = {
      success: true,
      data: { summary },
    };

    res.json(response);
  }

  // Get a single item
  async getItem(
    req: AuthenticatedRequest & { params: { itemId: string } },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { itemId } = req.params;
    const item = await inventoryService.getItemById(req.user.id, itemId);

    const response: ApiResponse = {
      success: true,
      data: { item },
    };

    res.json(response);
  }

  // Update an item
  async updateItem(
    req: AuthenticatedRequest & { params: { itemId: string }; body: UpdateInventoryItemInput },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { itemId } = req.params;
    const item = await inventoryService.updateItem(req.user.id, itemId, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Item updated',
      data: { item },
    };

    res.json(response);
  }

  // Delete an item
  async deleteItem(
    req: AuthenticatedRequest & { params: { itemId: string } },
    res: Response
  ): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const { itemId } = req.params;
    await inventoryService.deleteItem(req.user.id, itemId);

    const response: ApiResponse = {
      success: true,
      message: 'Item deleted',
    };

    res.json(response);
  }
}

export const inventoryController = new InventoryController();
