import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RequestWithUser } from "../src/Schema";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let token = req.cookies?.accessToken;
    console.log("Cookies:", req.cookies);
    if (!token && req.headers.authorization?.startsWith("Bearer ")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    const decoded = jwt.decode(token) as {
      id: string;
      email: string;
    };
    console.log("Decoded payload:", decoded);

    (req as RequestWithUser).user = decoded; // ✅ runtime-safe assignment
    console.log("Middleware user attached:", (req as any).user);

    next();
  } catch (err) {
    console.error("JWT verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
