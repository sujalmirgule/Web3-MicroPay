import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../auth/auth.service";
import { AppError } from "../errors/app-error";

/**
 * Express middleware: validates Bearer JWT from Authorization header.
 * Attaches { sub, userId, role } to req.user on success.
 */
export function requireAuth(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      next(new AppError("ERR_AUTH_TOKEN_EXPIRED", 401, "Authorization Bearer token is required."));
      return;
    }
    const token = authHeader.slice(7);
    try {
      const claims = await authService.verifyToken(token);
      (req as any).user = claims;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Express middleware: validates X-API-Key header for merchant M2M access.
 * Attaches { merchantId, walletAddress } to req.merchant on success.
 */
export function requireApiKey(authService: AuthService) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const rawKey = req.headers["x-api-key"] as string | undefined;
    if (!rawKey) {
      next(new AppError("ERR_AUTH_TOKEN_EXPIRED", 401, "X-API-Key header is required."));
      return;
    }
    try {
      const merchant = await authService.verifyApiKey(rawKey);
      (req as any).merchant = merchant;
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Express middleware: enforces minimum role level.
 */
export function requireRole(minRole: "USER" | "MERCHANT" | "ADMIN") {
  const hierarchy = { USER: 1, MERCHANT: 2, ADMIN: 3 };
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user;
    if (!user || hierarchy[user.role as keyof typeof hierarchy] < hierarchy[minRole]) {
      next(new AppError("ERR_FORBIDDEN_RESOURCE", 403, "Insufficient permissions for this operation."));
      return;
    }
    next();
  };
}
