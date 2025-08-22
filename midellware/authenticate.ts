import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RequestWithUser } from "../src/Schema";

export function authMiddleware(
  req: RequestWithUser,
  res: Response,
  next: NextFunction
) {
  const JWT_SECRET = process.env.JWT_SECRET as string;

  try {
    let token: string | undefined;

    token = req.cookies?.accessToken;
    console.log("req cookies", req.cookies.accessToken);
    console.log("token", token);

    if (!token && req.headers.authorization) {
      if (req.headers.authorization.startsWith("Bearer ")) {
        token = req.headers.authorization.split(" ")[1];
      }
    }

    if (!token) {
      return res
        .status(401)
        .json({ message: "Unauthorized: No token provided" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as unknown as {
        id: string;
        email: string;
      };
      req.user = decoded;
    } catch (err: any) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({ message: "Token expired" });
      }
      return res.status(401).json({ message: "Invalid token" });
    }

    next();
  } catch (err) {
    console.error("Auth middleware error:", err);
    return res
      .status(401)
      .json({ message: "Unauthorized: Invalid or expired token" });
  }
}
