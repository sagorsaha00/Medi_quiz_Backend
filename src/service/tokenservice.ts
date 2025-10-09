import createHttpError from "http-errors";
import * as jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { RefreshTokenSchema } from "../database/refreshToken";
import { JwtPayload } from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_SECRET as string;
const REFRESH_SECRET = process.env.JWT_SECRET as string;

if (!ACCESS_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT_SECRET environment variable is not set");
}

export class TokenService {
  constructor(private refreshTokenRepository: typeof RefreshTokenSchema) {}
  genarateAccessToken(payload: JwtPayload) {
    const plainPayload = JSON.parse(JSON.stringify(payload));

    const accessToken = jwt.sign(plainPayload, ACCESS_SECRET, {
      algorithm: "HS256",
      expiresIn: "10", // 10 min for testing
      jwtid: String(payload.id),
      subject: payload.email,
      issuer: "React_Native",
    });

    if (!accessToken) {
      throw createHttpError(500, "Failed to generate access token");
    }
    return accessToken;
  }

  genarateRefreshToken(payload: JwtPayload) {
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, {
      algorithm: "HS256",
      expiresIn: "3m", // 3 min for testing
      issuer: "React_Native",
      jwtid: String(payload.id),
    });

    return refreshToken;
  }

  async persistRefreshToken(user: any) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const newRefreshToken = new this.refreshTokenRepository({
      userId: user._id,
      email: user.email,
      
      expiresAt,
    });

    try {
      const savedRefreshToken = await newRefreshToken.save();

      return {
        id: savedRefreshToken._id,
      };
    } catch (error) {
      console.error("Error saving refresh token:", error);
      throw createHttpError(500, "Failed to persist refresh token");
    }
  }

  async verifyRefreshToken(
    token: string
  ): Promise<{ id: string; email: string,_id?: string }> {
    try {
      const payload = jwt.verify(token, REFRESH_SECRET) as {
        id: string;
        email: string;
      };
      return payload;
    } catch (err) {
      throw new Error("Invalid or expired refresh token");
    }
  }

  async findRefreshToken(token: string) {
    console.log("token", token);

    const checkToken = await this.refreshTokenRepository.findOne({
      _id: new mongoose.Types.ObjectId(token),
    });
    console.log("checkToken", checkToken);
    return checkToken;
  }

  async deleteRefreshToken(token: string) {
    await this.refreshTokenRepository.deleteOne({ token });
  }
}
