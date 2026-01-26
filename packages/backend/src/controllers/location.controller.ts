import { Response } from 'express';
import { AuthenticatedRequest, ApiResponse, PaginatedResponse } from '../types/index.js';
import { locationService } from '../services/location.service.js';
import { geolocationService } from '../services/geolocation.service.js';
import {
  CreateLocationInput,
  UpdateLocationInput,
  LocationListInput,
  NearbySearchInput,
} from '../validators/location.validator.js';

export class LocationController {
  // Create a new location (admin only)
  async createLocation(
    req: AuthenticatedRequest & { body: CreateLocationInput },
    res: Response
  ): Promise<void> {
    const location = await locationService.createLocation(req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Location created successfully',
      data: { location },
    };

    res.status(201).json(response);
  }

  // Get all locations with filters
  async getLocations(
    req: AuthenticatedRequest & { query: LocationListInput },
    res: Response
  ): Promise<void> {
    const result = await locationService.listLocations(req.query);

    const response: PaginatedResponse<typeof result.locations[0]> = {
      success: true,
      data: result.locations,
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

  // Find nearby locations
  async getNearbyLocations(
    req: AuthenticatedRequest & { query: NearbySearchInput },
    res: Response
  ): Promise<void> {
    const { latitude, longitude, radiusKm, page, limit } = req.query;

    const result = await geolocationService.findNearbyLocations({
      latitude,
      longitude,
      radiusKm,
      page,
      limit,
    });

    const response: PaginatedResponse<typeof result.locations[0]> = {
      success: true,
      data: result.locations,
      pagination: {
        page,
        limit,
        total: result.total,
        totalPages: Math.ceil(result.total / limit),
        hasNext: page < Math.ceil(result.total / limit),
        hasPrev: page > 1,
      },
    };

    res.json(response);
  }

  // Get location by ID
  async getLocationById(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const location = await locationService.getLocationById(id as string);

    const response: ApiResponse = {
      success: true,
      data: { location },
    };

    res.json(response);
  }

  // Get location by slug
  async getLocationBySlug(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { slug } = req.params;

    const location = await locationService.getLocationBySlug(slug as string);

    const response: ApiResponse = {
      success: true,
      data: { location },
    };

    res.json(response);
  }

  // Get location with units
  async getLocationWithUnits(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const location = await locationService.getLocationWithUnits(id as string);

    const response: ApiResponse = {
      success: true,
      data: { location },
    };

    res.json(response);
  }

  // Get location stats (admin)
  async getLocationStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const stats = await locationService.getLocationStats(id as string);

    const response: ApiResponse = {
      success: true,
      data: { stats },
    };

    res.json(response);
  }

  // Update location (admin only)
  async updateLocation(
    req: AuthenticatedRequest & { body: UpdateLocationInput },
    res: Response
  ): Promise<void> {
    const { id } = req.params;

    const location = await locationService.updateLocation(id as string, req.body);

    const response: ApiResponse = {
      success: true,
      message: 'Location updated successfully',
      data: { location },
    };

    res.json(response);
  }

  // Delete location (admin only)
  async deleteLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
    const { id } = req.params;

    await locationService.deleteLocation(id as string);

    const response: ApiResponse = {
      success: true,
      message: 'Location deleted successfully',
    };

    res.json(response);
  }

  // Get featured locations
  async getFeaturedLocations(req: AuthenticatedRequest, res: Response): Promise<void> {
    const limit = parseInt(req.query.limit as string) || 10;

    const locations = await geolocationService.getFeaturedLocations(limit);

    const response: ApiResponse = {
      success: true,
      data: { locations },
    };

    res.json(response);
  }
}

export const locationController = new LocationController();
