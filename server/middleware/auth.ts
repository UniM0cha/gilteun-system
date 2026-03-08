import { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!config.authPin) {
    next();
    return;
  }

  const token = req.cookies?.gilteun_auth;
  if (token === config.authPin) {
    next();
    return;
  }

  res.status(401).json({ error: "인증이 필요합니다" });
}
