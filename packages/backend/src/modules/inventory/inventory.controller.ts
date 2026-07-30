import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse } from '../../shared/types/index.js';
import { requireUser } from '../../shared/middleware/auth.middleware.js';
import { buildPagination } from '../../shared/utils/helpers.js';
import { inventoryService } from './inventory.service.js';
import {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  ListInventoryInput,
} from './inventory.validator.js';

export class InventoryController {
  // Add item to a booking
  async addItem(
    req: AuthenticatedRequest & { body: CreateInventoryItemInput; params: { bookingId: string } },
    res: Response
  ): Promise<void> {
    const user = requireUser(req);

    const { bookingId } = req.params;
    const item = await inventoryService.createItem(user.id, bookingId, req.body);

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
    const user = requireUser(req);

    const { bookingId } = req.params;
    const result = await inventoryService.listBookingItems(
      user.id,
      bookingId,
      req.query
    );

    const response: PaginatedResponse<(typeof result.items)[0]> = {
      success: true,
      data: result.items,
      pagination: buildPagination(req.query.page ?? 1, req.query.limit ?? 20, result.total),
    };

    res.json(response);
  }

  // Get all user's inventory items
  async getAllItems(
    req: AuthenticatedRequest & { query: ListInventoryInput },
    res: Response
  ): Promise<void> {
    const user = requireUser(req);

    const result = await inventoryService.listUserInventory(user.id, req.query);

    const response: PaginatedResponse<(typeof result.items)[0]> = {
      success: true,
      data: result.items,
      pagination: buildPagination(req.query.page ?? 1, req.query.limit ?? 20, result.total),
    };

    res.json(response);
  }

  // Get inventory summary
  async getSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    const user = requireUser(req);

    const summary = await inventoryService.getInventorySummary(user.id);

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
    const user = requireUser(req);

    const { itemId } = req.params;
    const item = await inventoryService.getItemById(user.id, itemId);

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
    const user = requireUser(req);

    const { itemId } = req.params;
    const item = await inventoryService.updateItem(user.id, itemId, req.body);

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
    const user = requireUser(req);

    const { itemId } = req.params;
    await inventoryService.deleteItem(user.id, itemId);

    const response: ApiResponse = {
      success: true,
      message: 'Item deleted',
    };

    res.json(response);
  }
}

export const inventoryController = new InventoryController();
