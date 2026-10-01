import type { Request, Response, NextFunction, RequestHandler } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma.client";
import { AuthService } from "../../auth/auth.service";
import { AppError } from "../../errors/app-error";
import { logger } from "../../utils/logger";

const NonceBodySchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EIP-55 Ethereum address"),
});

const VerifySiweBodySchema = z.object({
  message: z.string().min(50, "SIWE message is too short"),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, "Signature must be 0x + 130 hex chars"),
});

export function buildAuthRoutes(authService: AuthService) {
  /**
   * POST /auth/nonce
   * Issues a cryptographic SIWE challenge nonce.
   */
  const getNonce: RequestHandler = async (req, res, next) => {
    try {
      const body = NonceBodySchema.parse(req.body);
      const result = await authService.generateNonce(body.walletAddress);
      res.status(200).json({
        success: true,
        data: result,
        meta: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError("ERR_INVALID_VOUCHER_PARAMS", 400, err.errors[0]?.message ?? "Validation error"));
      } else {
        next(err);
      }
    }
  };

  /**
   * POST /auth/verify-siwe
   * Validates personal_sign signature; returns 24-hour Bearer JWT.
   */
  const verifySiwe: RequestHandler = async (req, res, next) => {
    try {
      const body = VerifySiweBodySchema.parse(req.body);
      const result = await authService.verifySiwe(body.message, body.signature);
      res.status(200).json({
        success: true,
        data: {
          accessToken: result.accessToken,
          expiresIn: 86400,
          user: result.user,
        },
        meta: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(new AppError("ERR_INVALID_VOUCHER_PARAMS", 400, err.errors[0]?.message ?? "Validation error"));
      } else {
        next(err);
      }
    }
  };

  /**
   * GET /auth/me
   * Returns the authenticated session's user profile.
   */
  const getMe: RequestHandler = async (req, res, next) => {
    try {
      const user = (req as any).user;
      const dbUser = await prisma.user.findUnique({
        where: { wallet_address: user.sub },
        select: { id: true, wallet_address: true, role: true, created_at: true },
      });

      if (!dbUser) {
        throw new AppError("ERR_CHANNEL_NOT_FOUND", 404, "User profile not found.");
      }

      res.status(200).json({
        success: true,
        data: {
          id: dbUser.id,
          walletAddress: dbUser.wallet_address,
          role: dbUser.role,
          createdAt: dbUser.created_at.toISOString(),
        },
        meta: { timestamp: new Date().toISOString(), requestId: req.requestId },
      });
    } catch (err) {
      next(err);
    }
  };

  return { getNonce, verifySiwe, getMe };
}

// Extend Express Request to include our custom fields
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: { sub: string; userId: string; role: string; chainId: number };
      merchant?: { merchantId: string; walletAddress: string };
    }
  }
}
