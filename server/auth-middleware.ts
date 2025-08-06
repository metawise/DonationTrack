import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import type { Staff } from "@shared/schema";

// Extend Express Request type to include staff
declare global {
  namespace Express {
    interface Request {
      staff?: Staff;
    }
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    const staff = await storage.getStaffBySessionToken(token);
    
    if (!staff) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    // Check if staff is active
    if (staff.status !== 'active') {
      return res.status(403).json({ error: "Account is not active" });
    }

    req.staff = staff;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: "Authentication error" });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.staff) {
      return res.status(401).json({ error: "Authentication required" });
    }

    if (!roles.includes(req.staff.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
};