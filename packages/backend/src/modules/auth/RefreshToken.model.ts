import { Schema, model, Document, Types } from 'mongoose';

interface IRefreshToken extends Document {
  token: string;
  userId: Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ token: 1 });

export const RefreshToken = model<IRefreshToken>('RefreshToken', refreshTokenSchema);
