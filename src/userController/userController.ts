import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../database/databaseSchema";

import { TokenService } from "../service/tokenservice";
import { RequestWithUser } from "../Schema";
import { JwtPayload } from "jsonwebtoken";
import mongoose from "mongoose";

export class UserController {
  constructor(private tokenService: TokenService) {}
  async createUser(req: Request, res: Response) {
    const { FirstName, LastName, Username, Email, Password } = req.body;

    if (!FirstName || !LastName || !Username || !Email || !Password) {
      return res.status(400).json({ message: "All fields are required." });
    }

    try {
      const existingUser = await User.findOne({ email: Email });
      if (existingUser) {
        return res.status(409).json({ message: "User already exists." });
      }

      const hashedPassword = await bcrypt.hash(Password, 10);
      const avatarUrl = `https://ui-avatars.com/api/?name=${FirstName}+${LastName}&background=random&size=128&rounded=true`;

      const newUser = new User({
        firstName: FirstName,
        lastName: LastName,
        username: Username,
        email: Email,
        password: hashedPassword,
        avatar: avatarUrl,
      });

      await newUser.save();
      const payload = { id: newUser._id as string, email: newUser.email };

      const accessToken = this.tokenService.genarateAccessToken(payload);
      const refreshToken = await this.tokenService.genarateRefreshToken(
        payload
      );

      res.cookie("accessToken", accessToken, {
        sameSite: "strict",
        maxAge: 1000 * 60 * 10, // 10 min
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
      });

      return res.status(201).json({
        message: "✅ Registration successful",
        user: {
          id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
          avatar: newUser.avatar,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      });
    } catch (err) {
      console.error("Register Error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async loginUser(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required." });
    }

    try {
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found." });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials." });
      }

      const payload = {
        id: String(user._id),
        email: user.email,
      };

      const accessToken = this.tokenService.genarateAccessToken(payload);
      const refreshToken = await this.tokenService.genarateRefreshToken(
        payload
      );

      // ✅ Cookies
      res.cookie("accessToken", accessToken, {
        sameSite: "strict",
        maxAge: 1000 * 60 * 10,
        httpOnly: true,
      });

      res.cookie("refreshToken", refreshToken, {
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true,
      });

      return res.status(200).json({
        message: "✅ Login successful",
        user: { id: user._id, email: user.email },
        tokens: { accessToken, refreshToken },
      });
    } catch (err) {
      console.error("Login Error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;
    console.log("refreshToken received:", refreshToken);

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);
      console.log("payload", payload);

      const tokenId = payload._id as string;

      const existingToken = await this.tokenService.findRefreshToken(tokenId);
      console.log("existingToken:", existingToken);

      if (!existingToken) {
        return res
          .status(402)
          .json({ message: "Refresh token not found in database" });
      }

      // 3. Generate new access token
      const newAccessToken = this.tokenService.genarateAccessToken({
        id: payload.id,
        email: payload.email,
      });
      console.log("newaccessToken generated:", newAccessToken);

      const newRefreshTokenResult =
        await this.tokenService.genarateRefreshToken({
          id: payload.id,
          email: payload.email,
        });

      await this.tokenService.deleteRefreshToken(refreshToken);

      return res.status(200).json({
        message: "Tokens refreshed successfully",
        tokens: {
          accessToken: newAccessToken,
          refreshToken: newRefreshTokenResult,
        },
      });
    } catch (err) {
      console.error("Refresh token error:", err);
      return res
        .status(403)
        .json({ message: "Invalid or expired refresh token" });
    }
  }

  async selfData(req: RequestWithUser, res: Response) {
 
    try {
      if (!req.user) {
        console.log("No user object found in request");
        return res.status(401).json({
          message: "Unauthorized: User data not found in request",
          error: "NO_USER_DATA",
        });
      }
 
      const userId = req.user.id || req.user;
      if (!userId) {
        console.log("No user ID found in token");
        return res.status(401).json({
          message: "Unauthorized: User ID missing from token",
          error: "NO_USER_ID",
        });
      }

      console.log("Searching for user with ID:", userId);
      const user = await User.findById(userId).select("-password");

      if (!user) {
        console.log("User not found in database for ID:", userId);
        return res.status(404).json({
          message: "User not found in database",
          error: "USER_NOT_FOUND",
        });
      }

      console.log("User found successfully:", user.email);

      return res.status(200).json({
        success: true,
        message: "User data fetched successfully",
        user,
      });
    } catch (err: any) {
      console.error("Self data error:", err);
      return res.status(500).json({
        message: "Server error while fetching user data",
        error: "SERVER_ERROR",
      });
    }
  }
}
