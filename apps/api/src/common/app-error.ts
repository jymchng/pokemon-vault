import { HttpException, HttpStatus } from "@nestjs/common";

/**
 * Centralized error classes (§101-102): domain errors mapped to HTTP with
 * stable machine-readable codes for the frontend. Every class carries a
 * stable `code` that the GlobalErrorFilter emits as `{ error: { code, ... } }`.
 */

export interface AppErrorOptions {
  message: string;
  /** Stable machine-readable code (§102). */
  code: string;
  status: number;
  details?: { path: string; message: string }[];
}

export class AppError extends HttpException {
  readonly code: string;
  readonly details?: { path: string; message: string }[];

  constructor(opts: AppErrorOptions) {
    super(opts.message, opts.status);
    this.code = opts.code;
    this.details = opts.details;
  }
}

// ── §102 stable codes ───────────────────────────────────────────────────────
export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
  AUTH_TOKEN_EXPIRED: "AUTH_TOKEN_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  INSUFFICIENT_INVENTORY: "INSUFFICIENT_INVENTORY",
  CART_EMPTY: "CART_EMPTY",
  CHECKOUT_FAILED: "CHECKOUT_FAILED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PACK_ALREADY_OPENED: "PACK_ALREADY_OPENED",
  REWARD_NOT_ELIGIBLE: "REWARD_NOT_ELIGIBLE",
  REWARD_ALREADY_REDEEMED: "REWARD_ALREADY_REDEEMED",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  CONFLICT: "CONFLICT",
  BAD_REQUEST: "BAD_REQUEST",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  FEATURE_DISABLED: "FEATURE_DISABLED",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ── Domain error classes (§101) ─────────────────────────────────────────────

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", code: ErrorCode = ERROR_CODES.NOT_FOUND) {
    super({ message, code, status: HttpStatus.NOT_FOUND });
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", code: ErrorCode = ERROR_CODES.UNAUTHORIZED) {
    super({ message, code, status: HttpStatus.UNAUTHORIZED });
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", code: ErrorCode = ERROR_CODES.FORBIDDEN) {
    super({ message, code, status: HttpStatus.FORBIDDEN });
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: { path: string; message: string }[]) {
    super({ message, code: ERROR_CODES.VALIDATION_ERROR, status: HttpStatus.BAD_REQUEST, details });
  }
}

export class ConflictError extends AppError {
  constructor(message = "Conflict", code: ErrorCode = ERROR_CODES.CONFLICT) {
    super({ message, code, status: HttpStatus.CONFLICT });
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad request", code: ErrorCode = ERROR_CODES.BAD_REQUEST) {
    super({ message, code, status: HttpStatus.BAD_REQUEST });
  }
}

export class PaymentError extends AppError {
  constructor(message = "Payment failed", code: ErrorCode = ERROR_CODES.PAYMENT_FAILED) {
    super({ message, code, status: HttpStatus.PAYMENT_REQUIRED });
  }
}

export class InventoryError extends AppError {
  constructor(message = "Insufficient inventory", code: ErrorCode = ERROR_CODES.INSUFFICIENT_INVENTORY) {
    super({ message, code, status: HttpStatus.CONFLICT });
  }
}

/** §107: feature-gated endpoint/service disabled at runtime (403). */
export class FeatureDisabledError extends AppError {
  constructor(message = "This feature is currently disabled") {
    super({ message, code: ERROR_CODES.FEATURE_DISABLED, status: HttpStatus.FORBIDDEN });
  }
}

// ── Convenience factories with §102 codes ───────────────────────────────────
export const err = {
  invalidCredentials: (m = "Invalid credentials") =>
    new UnauthorizedError(m, ERROR_CODES.AUTH_INVALID_CREDENTIALS),
  tokenExpired: (m = "Token expired") => new UnauthorizedError(m, ERROR_CODES.AUTH_TOKEN_EXPIRED),
  tokenInvalid: (m = "Invalid token") => new UnauthorizedError(m, ERROR_CODES.AUTH_TOKEN_INVALID),
  productNotFound: (m = "Product not found") => new NotFoundError(m, ERROR_CODES.PRODUCT_NOT_FOUND),
  insufficientInventory: (m = "Insufficient inventory") =>
    new InventoryError(m, ERROR_CODES.INSUFFICIENT_INVENTORY),
  cartEmpty: (m = "Cart is empty") => new BadRequestError(m, ERROR_CODES.CART_EMPTY),
  checkoutFailed: (m = "Checkout failed") => new BadRequestError(m, ERROR_CODES.CHECKOUT_FAILED),
  paymentFailed: (m = "Payment failed") => new PaymentError(m, ERROR_CODES.PAYMENT_FAILED),
  packAlreadyOpened: (m = "Pack already opened with this key") =>
    new ConflictError(m, ERROR_CODES.PACK_ALREADY_OPENED),
  rewardNotEligible: (m = "Reward not eligible") =>
    new ConflictError(m, ERROR_CODES.REWARD_NOT_ELIGIBLE),
  rewardAlreadyRedeemed: (m = "Reward already redeemed") =>
    new ConflictError(m, ERROR_CODES.REWARD_ALREADY_REDEEMED),
  featureDisabled: (m = "This feature is currently disabled") => new FeatureDisabledError(m),
};
