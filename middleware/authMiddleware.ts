import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";

export const verifyToken = (req: any, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret_key");
    req.user = decoded; // এতে ইউজারের id, role এবং tenantId থাকবে
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
};

// রোল চেক করার জন্য ফাংশন
export const checkRole = (roles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "You don't have permission for this action" });
    }
    next();
  };
};
