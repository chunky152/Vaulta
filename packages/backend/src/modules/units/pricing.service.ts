import { StorageUnit, IStorageUnit } from './StorageUnit.model.js';
import { PricingRule as PricingRuleModel } from './PricingRule.model.js';
import { BookingPriceCalculation, PriceAdjustment, NotFoundError } from '../../shared/types/index.js';
import { calculateDuration, determinePricingType } from '../../shared/utils/helpers.js';


interface PricingRule {
  id: string;
  name: string;
  ruleType: string;
  conditions: Record<string, unknown>;
  multiplier: number;
  priority: number;
}

export class PricingService {
  // Calculate price for a booking
  async calculatePrice(
    unitId: string,
    startTime: Date,
    endTime: Date
  ): Promise<BookingPriceCalculation> {
    const unit = await StorageUnit.findById(unitId).populate({
      path: 'locationId',
      select: 'city',
    });

    if (!unit) {
      throw new NotFoundError('Storage unit');
    }

    const duration = calculateDuration(startTime, endTime);
    const pricingType = determinePricingType(duration.hours);

    // Get base price based on duration type
    let basePrice: number;
    switch (pricingType) {
      case 'hourly':
        basePrice = unit.basePriceHourly * duration.hours;
        break;
      case 'daily':
        basePrice = unit.basePriceDaily * duration.days;
        break;
      case 'monthly':
        basePrice = (unit.basePriceMonthly ?? unit.basePriceDaily * 30) * duration.months;
        break;
      default:
        basePrice = unit.basePriceHourly * duration.hours;
    }

    // Get applicable pricing rules
    const adjustments = await this.getApplicablePriceAdjustments(
      unit,
      startTime,
      endTime,
      basePrice
    );

    // Calculate subtotal with adjustments
    let subtotal = basePrice;
    for (const adjustment of adjustments) {
      if (adjustment.type === 'discount') {
        subtotal -= adjustment.amount;
      } else {
        subtotal += adjustment.amount;
      }
    }

    // Ensure minimum price
    subtotal = Math.max(subtotal, unit.basePriceHourly);

    // Calculate tax (configurable, defaulting to 10%)
    const taxRate = 0.10;
    const tax = Math.round(subtotal * taxRate * 100) / 100;

    // Round to 2 decimal places
    const total = Math.round((subtotal + tax) * 100) / 100;

    return {
      basePrice: Math.round(basePrice * 100) / 100,
      duration: duration.hours,
      durationType: pricingType,
      adjustments,
      subtotal: Math.round(subtotal * 100) / 100,
      tax,
      total,
      currency: unit.currency,
    };
  }

  // Get applicable price adjustments
  private async getApplicablePriceAdjustments(
    unit: IStorageUnit,
    startTime: Date,
    endTime: Date,
    basePrice: number
  ): Promise<PriceAdjustment[]> {
    const adjustments: PriceAdjustment[] = [];

    // Get active pricing rules
    const rules = await this.getActivePricingRules();

    for (const rule of rules) {
      const adjustment = this.evaluateRule(
        rule,
        unit,
        startTime,
        endTime,
        basePrice
      );
      if (adjustment) {
        adjustments.push(adjustment);
      }
    }

    return adjustments;
  }

  // Evaluate a single pricing rule
  private evaluateRule(
    rule: PricingRule,
    unit: IStorageUnit,
    startTime: Date,
    endTime: Date,
    basePrice: number
  ): PriceAdjustment | null {
    const conditions = rule.conditions as {
      dayOfWeek?: number[];
      hourRange?: { start: number; end: number };
      minDuration?: number;
      maxDuration?: number;
      unitSize?: string[];
      cities?: string[];
    };

    // Check day of week condition
    if (conditions.dayOfWeek) {
      const startDay = startTime.getDay();
      if (!conditions.dayOfWeek.includes(startDay)) {
        return null;
      }
    }

    // Check hour range condition
    if (conditions.hourRange) {
      const startHour = startTime.getHours();
      if (
        startHour < conditions.hourRange.start ||
        startHour >= conditions.hourRange.end
      ) {
        return null;
      }
    }

    // Check duration conditions
    const durationHours =
      (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

    if (conditions.minDuration && durationHours < conditions.minDuration) {
      return null;
    }

    if (conditions.maxDuration && durationHours > conditions.maxDuration) {
      return null;
    }

    // Check unit size condition
    if (conditions.unitSize && !conditions.unitSize.includes(unit.size)) {
      return null;
    }

    // Check city condition; calculatePrice populates locationId, so the
    // location document (if loaded) lives on that field
    if (conditions.cities) {
      const city = (unit.locationId as unknown as { city?: string })?.city;
      if (!city || !conditions.cities.includes(city)) {
        return null;
      }
    }

    // Calculate adjustment amount
    const adjustmentAmount = basePrice * (Math.abs(rule.multiplier - 1));

    return {
      name: rule.name,
      type: rule.multiplier >= 1 ? 'surcharge' : 'discount',
      amount: Math.round(adjustmentAmount * 100) / 100,
      percentage: Math.round((rule.multiplier - 1) * 100),
    };
  }

  // Get active pricing rules from database
  private async getActivePricingRules(): Promise<PricingRule[]> {
    const now = new Date();
    const rules = await PricingRuleModel.find({
      isActive: true,
      $or: [
        { startDate: null, endDate: null },
        {
          startDate: { $lte: now },
          endDate: { $gte: now },
        },
        {
          startDate: { $lte: now },
          endDate: null,
        },
        {
          startDate: null,
          endDate: { $gte: now },
        },
      ],
    }).sort({ priority: -1 });

    return rules.map((rule) => ({
      id: rule._id.toString(),
      name: rule.name,
      ruleType: rule.ruleType,
      conditions: rule.conditions as Record<string, unknown>,
      multiplier: rule.multiplier,
      priority: rule.priority,
    }));
  }

  // Create a pricing rule
  async createPricingRule(data: {
    name: string;
    description?: string;
    ruleType: string;
    conditions: Record<string, unknown>;
    multiplier: number;
    priority?: number;
    startDate?: Date;
    endDate?: Date;
  }): Promise<void> {
    await PricingRuleModel.create({
      ...data,
      priority: data.priority ?? 0,
    });
  }

  // Get estimated prices for different durations
  async getEstimatedPrices(unitId: string): Promise<{
    hourly: number;
    daily: number;
    weekly: number;
    monthly: number;
    currency: string;
  }> {
    const unit = await StorageUnit.findById(unitId);

    if (!unit) {
      throw new NotFoundError('Storage unit');
    }

    return {
      hourly: unit.basePriceHourly,
      daily: unit.basePriceDaily,
      weekly: unit.basePriceDaily * 7,
      monthly: unit.basePriceMonthly ?? unit.basePriceDaily * 30,
      currency: unit.currency,
    };
  }
}

export const pricingService = new PricingService();
