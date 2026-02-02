import { Schema, model, Document } from 'mongoose';

interface IRefreshToken extends Document {
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: 'objectId', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ token: 1 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
