import crypto from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "../db/prisma.client";
import { ProductionRedisService } from "../redis/redis.production.service";
import { AppError } from "../errors/app-error";
import { logger } from "../utils/logger";
import { ethers } from "ethers";

export interface JwtPayload {
  sub: string;          // wallet address
  userId: string;
  role: string;
  chainId: number;
  iat?: number;
  exp?: number;
  iss?: string;
}

export class AuthService {
  private readonly jwtSecret: Uint8Array;
  private readonly jwtTtlSeconds: number = 86400; // 24 hours
  private readonly issuer = "web3micropay.io";

  constructor(private readonly redisService: ProductionRedisService) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET environment variable is not set");
    this.jwtSecret = new TextEncoder().encode(secret);
  }

  /**
   * Generates a cryptographically secure SIWE nonce and caches it for 5 minutes.
   */
  public async generateNonce(walletAddress: string): Promise<{
    nonce: string;
    statement: string;
    issuedAt: string;
    expiresAt: string;
  }> {
    const nonce = crypto.randomBytes(16).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);

    await this.redisService.setSiweNonce(walletAddress, nonce);
    logger.info({ walletAddress }, "SIWE nonce issued");

    return {
      nonce,
      statement: "Sign in to Web3 MicroPay to authenticate your off-chain session.",
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };
  }

  /**
   * Verifies SIWE personal_sign message and signature.
   * Consumes nonce (single-use) on success.
   */
  public async verifySiwe(
    message: string,
    signature: string
  ): Promise<{ accessToken: string; user: { walletAddress: string; role: string } }> {
    // Extract wallet address from message (first Ethereum address found)
    const addressMatch = message.match(/0x[a-fA-F0-9]{40}/);
    if (!addressMatch) {
      throw new AppError("ERR_AUTH_INVALID_SIGNATURE", 401, "Cannot parse wallet address from SIWE message.");
    }
    const walletAddress = ethers.getAddress(addressMatch[0]);

    // Recover signer via EIP-191 personal_sign
    let recoveredAddress: string;
    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
    } catch {
      throw new AppError("ERR_AUTH_INVALID_SIGNATURE", 401, "Signature recovery failed.");
    }

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new AppError("ERR_AUTH_INVALID_SIGNATURE", 401, "Recovered signer does not match wallet address.");
    }

    // Consume and verify nonce (single-use)
    const storedNonce = await this.redisService.consumeSiweNonce(walletAddress);
    if (!storedNonce) {
      throw new AppError("ERR_AUTH_INVALID_NONCE", 401, "Login challenge expired or was already used. Please re-authenticate.");
    }
    if (!message.includes(storedNonce)) {
      throw new AppError("ERR_AUTH_INVALID_NONCE", 401, "Message nonce does not match issued challenge.");
    }

    // Upsert user in PostgreSQL
    const user = await prisma.user.upsert({
      where: { wallet_address: walletAddress.toLowerCase() },
      update: { updated_at: new Date() },
      create: {
        wallet_address: walletAddress.toLowerCase(),
        role: "USER",
      },
    });

    // Issue JWT
    const accessToken = await new SignJWT({
      sub: walletAddress.toLowerCase(),
      userId: user.id,
      role: user.role,
      chainId: parseInt(process.env.CHAIN_ID ?? "31337"),
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setIssuedAt()
      .setIssuer(this.issuer)
      .setExpirationTime(`${this.jwtTtlSeconds}s`)
      .sign(this.jwtSecret);

    logger.info({ walletAddress: walletAddress.toLowerCase(), userId: user.id }, "SIWE authentication successful");

    return {
      accessToken,
      user: {
        walletAddress: walletAddress.toLowerCase(),
        role: user.role,
      },
    };
  }

  /**
   * Validates a JWT and returns its claims.
   */
  public async verifyToken(token: string): Promise<JwtPayload> {
    try {
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        issuer: this.issuer,
      });
      return payload as unknown as JwtPayload;
    } catch {
      throw new AppError("ERR_AUTH_TOKEN_EXPIRED", 401, "Session token is invalid or expired. Please refresh.");
    }
  }

  /**
   * Validates a merchant API key by hashing and querying the DB.
   */
  public async verifyApiKey(rawApiKey: string): Promise<{ merchantId: string; walletAddress: string }> {
    const hash = crypto.createHash("sha256").update(rawApiKey).digest("hex");

    const merchant = await prisma.merchant.findUnique({
      where: { api_key_hash: hash },
    });

    if (!merchant || !merchant.is_active) {
      throw new AppError("ERR_AUTH_INVALID_SIGNATURE", 401, "Invalid or inactive API key.");
    }

    return { merchantId: merchant.id, walletAddress: merchant.wallet_address };
  }
}
