import { Schema, model, Document } from 'mongoose';

interface IPricingRule extends Document {
  name: string;
  description?: string;
  ruleType: string;
  conditions?: Record<string, unknown>;
  multiplier: number;
  isActive: boolean;
  priority: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const pricingRuleSchema = new Schema<IPricingRule>(
  {
    name: { type: String, required: true },
    description: String,
    ruleType: { type: String, required: true },
    conditions: Schema.Types.Mixed,
    multiplier: { type: Number, default: 1.0 },
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
  },
  { timestamps: true }
);

pricingRuleSchema.index({ ruleType: 1 });
pricingRuleSchema.index({ isActive: 1 });

export const PricingRule = model<IPricingRule>('PricingRule', pricingRuleSchema);
