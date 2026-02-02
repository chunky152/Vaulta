import { Schema, model, Document } from 'mongoose';

export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

interface IUser extends Document {
  email: string;
  passwordHash: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role: UserRole;
  emailVerified: boolean;
  phoneVerified: boolean;
  profileImageUrl?: string;
  referralCode: string;
  referredById?: string;
  loyaltyPoints: number;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    firstName: String,
    lastName: String,
    phone: String,
    role: { type: String, enum: Object.values(UserRole), default: UserRole.CUSTOMER },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    profileImageUrl: String,
    referralCode: { type: String, required: true, unique: true },
    referredById: 'objectId',
    loyaltyPoints: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.index({ email: 1 });
userSchema.index({ referralCode: 1 });
userSchema.index({ role: 1 });

export const User = model<IUser>('User', userSchema);
