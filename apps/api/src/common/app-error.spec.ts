import { describe, expect, it } from "vitest";
import { AppError, ERROR_CODES, err } from "./app-error";

describe("centralized errors (§101-102)", () => {
  it("maps domain errors to HTTP statuses with stable codes", () => {
    expect(err.invalidCredentials().getStatus()).toBe(401);
    expect(err.invalidCredentials().code).toBe("AUTH_INVALID_CREDENTIALS");
    expect(err.productNotFound().getStatus()).toBe(404);
    expect(err.productNotFound().code).toBe("PRODUCT_NOT_FOUND");
    expect(err.cartEmpty().code).toBe("CART_EMPTY");
    expect(err.paymentFailed().getStatus()).toBe(402);
    expect(err.paymentFailed().code).toBe("PAYMENT_FAILED");
    expect(err.insufficientInventory().code).toBe("INSUFFICIENT_INVENTORY");
    expect(err.packAlreadyOpened().code).toBe("PACK_ALREADY_OPENED");
    expect(err.rewardNotEligible().code).toBe("REWARD_NOT_ELIGIBLE");
    expect(err.rewardAlreadyRedeemed().code).toBe("REWARD_ALREADY_REDEEMED");
    expect(err.checkoutFailed().code).toBe("CHECKOUT_FAILED");
  });

  it("all §102 codes are unique and present", () => {
    const codes = Object.values(ERROR_CODES);
    expect(new Set(codes).size).toBe(codes.length); // unique
    for (const c of [
      "AUTH_INVALID_CREDENTIALS", "PRODUCT_NOT_FOUND", "INSUFFICIENT_INVENTORY",
      "CART_EMPTY", "CHECKOUT_FAILED", "PAYMENT_FAILED", "PACK_ALREADY_OPENED",
      "REWARD_NOT_ELIGIBLE", "REWARD_ALREADY_REDEEMED",
    ]) {
      expect(codes).toContain(c);
    }
  });

  it("AppError carries message + status + code + optional details", () => {
    const e = new AppError({ message: "x", code: "CUSTOM", status: 422, details: [{ path: "a", message: "bad" }] });
    expect(e.message).toBe("x");
    expect(e.getStatus()).toBe(422);
    expect(e.code).toBe("CUSTOM");
    expect(e.details).toEqual([{ path: "a", message: "bad" }]);
  });
});
