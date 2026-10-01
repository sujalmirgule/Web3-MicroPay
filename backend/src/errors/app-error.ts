export type ErrorCode =
  | "ERR_VALIDATION_FAILED"
  | "ERR_AUTH_INVALID_NONCE"
  | "ERR_AUTH_INVALID_SIGNATURE"
  | "ERR_AUTH_TOKEN_EXPIRED"
  | "ERR_FORBIDDEN_RESOURCE"
  | "ERR_CHANNEL_NOT_FOUND"
  | "ERR_CHANNEL_NOT_ACTIVE"
  | "ERR_CHANNEL_CLOSED"
  | "ERR_CHANNEL_EXPIRED"
  | "ERR_CHANNEL_CAPACITY_EXCEEDED"
  | "ERR_VOUCHER_NONCE_OUT_OF_ORDER"
  | "ERR_VOUCHER_NONCE_STALE"
  | "ERR_VOUCHER_CAPACITY_EXCEEDED"
  | "ERR_VOUCHER_SIGNATURE_INVALID"
  | "ERR_VOUCHER_EXPIRED"
  | "ERR_VOUCHER_AMOUNT_BELOW_SETTLED"
  | "ERR_INVALID_VOUCHER_PARAMS"
  | "ERR_SETTLEMENT_ALREADY_PENDING"
  | "ERR_RELAYER_LOW_BALANCE"
  | "ERR_RPC_TIMEOUT"
  | "ERR_TX_REVERTED"
  | "ERR_DATABASE_UNAVAILABLE"
  | "ERR_RATE_LIMIT_EXCEEDED";

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  constructor(code: ErrorCode, statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
        timestamp: new Date().toISOString(),
      },
    };
  }
}
