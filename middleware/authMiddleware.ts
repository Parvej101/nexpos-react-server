import { NextFunction, Response } from "express";
import jwt from "jsonwebtoken";
import { Tenant } from "../models/Tenant.js";

export const verifyToken = async (
  req: any,
  res: Response,
  next: NextFunction,
) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(403).json({ message: "No token provided" });

  try {
    const decoded: any = jwt.verify(
      token,
      process.env.JWT_SECRET || "secret_key",
    );
    req.user = decoded;

    // [সংশোধিত লজিক]
    // যদি ইউজার সুপার অ্যাডমিন হয়, তবে দোকানের স্ট্যাটাস চেক করার দরকার নেই
    if (req.user.role === "super_admin") {
      return next();
    }

    // অন্য সব রোলের (shop_owner, cashier) জন্য দোকান সচল কি না তা চেক হবে
    const tenant = await Tenant.findById(req.user.tenantId);

    if (!tenant || tenant.status === "inactive") {
      return res
        .status(403)
        .json({ message: "Shop access suspended. Contact Admin." });
    }

    next();
  } catch (error) {
    res.status(401).json({ message: "Session expired" });
  }
};

/**
 * ২. authorize: এটি চেক করবে ইউজারের ওই কাজটি করার পারমিশন আছে কি না।
 * উদাহরণ: authorize(['super_admin', 'shop_owner'])
 */
export const authorize = (allowedRoles: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Unauthorized. User data not found." });
    }

    // ইউজারের রোল যদি এলাউড লিস্টে না থাকে
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Permission denied. ${req.user.role} cannot perform this action.`,
      });
    }

    next();
  };
};
