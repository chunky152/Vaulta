import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse } from '../types/index.js';
import { unitService } from '../services/unit.service.js';
import { pricingService } from '../services/pricing.service.js';
import {
  CreateUnitInput,
  UpdateUnitInput,
  UnitSearchInput,
  UnitAvailabilityInput,
  UpdateUnitStatusInput,
  BulkCreateUnitsInput,
} from '../validators/unit.validator.js';

export class UnitController {
  // Create a new unit (admin only)
  async createUnit(
    req: AuthenticatedRequest & { body: CreateUnitInput },
    res: Response
  ): Promise<void> {
    const unit = await unitService.createUnit(req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Unit created successfully',
      data: { unit },
    };

    res.status(201).json(response);
  }

  // Create multiple units (admin only)
  async createBulkUnits(
    req: AuthenticatedRequest & { body: BulkCreateUnitsInput },
    res: Response
  ): Promise<void> {
    const { locationId, units } = req.body;

    const createdUnits = await unitService.createBulkUnits(locationId, units);

    const response: ApiResponse = {
      success: true,
      message: `${createdUnits.length} units created successfully`,
      data: { units: createdUnits },
    };

    res.status(201).json(response);
  }

  // Get all units with filters
  async getUnits(
    req: AuthenticatedRequest & { query: UnitSearchInput },
    res: Response
  ): Promise<void> {
    const result = await unitService.listUnits(req.query);

    const response: PaginatedResponse<typeof result.units[0]> = {
      success: true,
      data: result.units,
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

  // Get unit by ID
  async getUnitById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const unit = await unitService.getUnitById(id as string);

    const response: ApiResponse = {
      success: true,
      data: { unit },
    };

    res.json(response);
  }

  // Check unit availability
  async checkAvailability(
    req: AuthenticatedRequest & { query: UnitAvailabilityInput },
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { startTime, endTime } = req.query;

    const availability = await unitService.checkAvailability(
      id as string,
      startTime,
      endTime
    );

    const response: ApiResponse = {
      success: true,
      data: availability,
    };

    res.json(response);
  }

  // Get available units at a location
  async getAvailableUnits(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { locationId } = req.params;
    const { startTime, endTime, size } = req.query;

    if (!startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'startTime and endTime are required',
      });
      return;
    }

    const units = await unitService.getAvailableUnits(
      locationId as string,
      new Date(startTime as string),
      new Date(endTime as string),
      size as string
    );

    const response: ApiResponse = {
      success: true,
      data: { units },
    };

    res.json(response);
  }

  // Get unit price estimates
  async getPriceEstimates(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const prices = await pricingService.getEstimatedPrices(id as string);

    const response: ApiResponse = {
      success: true,
      data: { prices },
    };

    res.json(response);
  }

  // Calculate price for specific time period
  async calculatePrice(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const { startTime, endTime } = req.query;

    if (!startTime || !endTime) {
      res.status(400).json({
        success: false,
        error: 'startTime and endTime are required',
      });
      return;
    }

    const priceCalculation = await pricingService.calculatePrice(
      id as string,
      new Date(startTime as string),
      new Date(endTime as string)
    );

    const response: ApiResponse = {
      success: true,
      data: { pricing: priceCalculation },
    };

    res.json(response);
  }

  // Update unit (admin only)
  async updateUnit(
    req: AuthenticatedRequest & { body: UpdateUnitInput },
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const unit = await unitService.updateUnit(id as string, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Unit updated successfully',
      data: { unit },
    };

    res.json(response);
  }

  // Update unit status (admin only)
  async updateStatus(
    req: AuthenticatedRequest & { body: UpdateUnitStatusInput },
    res: Response
  ): Promise<void> {
    const { id } = req.params;
    const { status } = req.body;

    const unit = await unitService.updateStatus(id as string, status);

    const response: ApiResponse = {
      success: true,
      message: 'Unit status updated successfully',
      data: { unit },
    };

    res.json(response);
  }

  // Delete unit (admin only)
  async deleteUnit(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    await unitService.deleteUnit(id as string);

    const response: ApiResponse = {
      success: true,
      message: 'Unit deleted successfully',
    };

    res.json(response);
  }
}

export const unitController = new UnitController();
