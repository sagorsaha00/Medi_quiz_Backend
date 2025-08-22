import { Request, Response } from "express";
import bcrypt from "bcrypt";
import User from "../database/databaseSchema";

import { TokenService } from "../service/tokenservice";
import { RequestWithUser } from "../Schema";
import { JwtPayload } from "jsonwebtoken";

export class UserController {
  constructor(private tokenService: TokenService) {}
  async createUser(req: Request, res: Response) {
    const { FirstName, LastName, Username, Email, Password } = req.body;

    if (!FirstName || !LastName || !Username || !Email || !Password) {
      return res.status(400).json({ message: "Email and password required." });
    }

    try {
      const existingUser = await User.findOne({ email: Email });
      if (existingUser) {
        return res.status(409).json({ message: "User already exists." });
      }

      const hashedPassword = await bcrypt.hash(Password, 10);

      const newUser = new User({
        firstName: FirstName,
        lastName: LastName,
        username: Username,
        email: Email,
        password: hashedPassword,
      });
      await newUser.save();

      const payload = { id: newUser._id, email: newUser.email };

      // Generate tokens
      const accessToken = this.tokenService.genarateAccessToken(payload);
      const persistedRefreshToken = await this.tokenService.persistRefreshToken(
        payload
      );
      const refreshToken = this.tokenService.genarateRefreshToken({
        ...payload,
        id: persistedRefreshToken.id,
      });

      return res.status(201).json({
        message: "✅ Registration successful",
        user: {
          id: newUser._id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          username: newUser.username,
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
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "User Doesn't Match Your Info " });
    }
    const checkusername = await User.findOne({ username });
    if (!checkusername) {
      return null;
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

      const payload: JwtPayload = { id: String(user._id), email: user.email };

      const accessToken = this.tokenService.genarateAccessToken(payload);

      const persistedRefreshToken = await this.tokenService.persistRefreshToken(
        user
      );

      const newrefreshToken = this.tokenService.genarateRefreshToken({
        ...payload,
        id: persistedRefreshToken.id,
      });

      res.cookie("accessToken", accessToken, {
        sameSite: "strict",
        maxAge: 1000 * 60 * 60,
        httpOnly: true,
      });
      console.log("token set in cookie", accessToken);
      res.cookie("refreshToken", newrefreshToken, {
        sameSite: "strict",
        maxAge: 1000 * 60 * 60 * 24 * 365, //1y
        httpOnly: true,
      });
      console.log("token set is cookie", newrefreshToken);
      // Persist the new refresh token

      return res.status(200).json({
        message: "✅ Login successful",
        user: { id: user._id, email: user.email },
        tokens: {
          accessToken,
          refreshToken: newrefreshToken,
        },
      });
    } catch (err) {
      console.error("Login Error:", err);
      return res.status(500).json({ message: "Server error" });
    }
  }

  async refreshToken(req: Request, res: Response) {
    const { refreshToken } = req.body;
    console.log("req body:", req.body);
    console.log("refreshToken from request body:", refreshToken);
    console.log("refreshToken from request body id:", refreshToken.id);
    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    try {
      const payload = await this.tokenService.verifyRefreshToken(refreshToken);

      // 2. Check if refresh token exists in database
      const existingToken = await this.tokenService.findRefreshToken(
        refreshToken.id
      );
      if (!existingToken) {
        return res
          .status(403)
          .json({ message: "Refresh token not found in database" });
      }

      // 3. Generate new access token
      const newAccessToken = this.tokenService.genarateAccessToken({
        id: payload.id,
        email: payload.email,
      });

      // 4. Rotate refresh token (delete old, create new)
      const newRefreshTokenResult =
        await this.tokenService.genarateRefreshToken({
          refreshToken,
          id: payload.id,
          email: payload.email,
        });
      await this.tokenService.deleteRefreshToken(refreshToken);
      console.log("Tokens refreshed successfully");

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
      // req.user এর বদলে পুরো req log করবেন না, security risk
      console.log("req.user exists:", !!req.user);
      console.log("req.user data:", req.user);

      // User object check করুন
      if (!req.user) {
        console.log("No user object found in request");
        return res.status(401).json({
          message: "Unauthorized: User data not found in request",
          error: "NO_USER_DATA",
        });
      }

      const userId = req.user.id;
      console.log("User ID from token:", userId);

      if (!userId) {
        console.log("No user ID found in token");
        return res.status(401).json({
          message: "Unauthorized: User ID missing from token",
          error: "NO_USER_ID",
        });
      }

      // Database থেকে user খুঁজুন
      console.log("Searching for user with ID:", userId);
      const user = await User.findById(userId);

      if (!user) {
        console.log("User not found in database for ID:", userId);
        return res.status(404).json({
          message: "User not found in database",
          error: "USER_NOT_FOUND",
        });
      }

      console.log("User found successfully:", user.email);

      // Password field বাদ দিয়ে response পাঠান
      const { password, ...userWithoutPassword } = user.toObject();

      return res.status(200).json({
        message: "User data fetched successfully",
        user: userWithoutPassword,
        success: true,
      });
    } catch (err: any) {
      console.error("Self data error:", err);
      return res.status(500).json({
        message: "Server error while fetching user data",
        error: "SERVER_ERROR",
        ...(process.env.NODE_ENV === "development" && { details: err.message }),
      });
    }
  }
}
