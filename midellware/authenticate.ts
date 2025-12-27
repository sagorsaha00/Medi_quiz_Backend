import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    let token = req.cookies?.accessToken;

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

export interface RequestWithUser extends Request {
  user?: any;
}

export const verifyAccessToken = (
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  console.log("authHeader", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Unauthorized: No token provided",
      error: "NO_TOKEN",
    });
  }

  const token = authHeader.split(" ")[1];
  console.log("Extracted token:", token);

  try {
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      email: string;
    };

    console.log("✅ Token verified successfully:", decoded);
    req.user = decoded;
    next();
  } catch (err: any) {
    console.error("❌ JWT verification failed:", err.message);


    if (err.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Token expired, please login again",
        error: "TOKEN_EXPIRED",
      });
    }

    // অন্য কোনো সমস্যা হলে
    return res.status(403).json({
      message: "Invalid token",
      error: "INVALID_TOKEN",
    });
  }
};
