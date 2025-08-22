// models/RefreshToken.ts
import { Schema, model, Document } from "mongoose";

export interface IRefreshToken extends Document {
  userId: string | Schema.Types.ObjectId;
  email: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  userAgent?: string;
  ipAddress?: string;
}

const refreshTokenSchema = new Schema<IRefreshToken>({
  userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: "User",
  },
  email: {
    type: String,
    required: true,
  },

  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  userAgent: {
    type: String,
  },
  ipAddress: {
    type: String,
  },
});

// TTL index for automatic deletion
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshTokenSchema = model<IRefreshToken>(
  "RefreshToken",
  refreshTokenSchema
);
