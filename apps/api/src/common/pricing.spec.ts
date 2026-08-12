import { computePrices } from "./pricing";

describe("G17 server-side pricing", () => {
  it("computes subtotal only with zero rates", () => {
    const p = computePrices([{ unitPrice: 5.99, quantity: 2 }], "USD", {
      taxRatePercent: 0, flatShippingUsd: 0, freeShippingThresholdUsd: 0, discountRatePercent: 0,
    });
    expect(p.subtotal).toBe(11.98);
    expect(p.discount).toBe(0);
    expect(p.shipping).toBe(0);
    expect(p.tax).toBe(0);
    expect(p.total).toBe(11.98);
  });

  it("applies tax, shipping and discount server-side", () => {
    const p = computePrices([{ unitPrice: 100, quantity: 1 }], "USD", {
      taxRatePercent: 10, flatShippingUsd: 5, freeShippingThresholdUsd: 0, discountRatePercent: 10,
    });
    expect(p.subtotal).toBe(100);
    expect(p.discount).toBe(10);
    expect(p.shipping).toBe(5);
    expect(p.tax).toBe(9); // 10% of (100 - 10)
    expect(p.total).toBe(104);
  });

  it("waives shipping above the free-shipping threshold", () => {
    const p = computePrices([{ unitPrice: 60, quantity: 1 }], "USD", {
      taxRatePercent: 0, flatShippingUsd: 5, freeShippingThresholdUsd: 50, discountRatePercent: 0,
    });
    expect(p.shipping).toBe(0);
    expect(p.total).toBe(60);
  });

  it("rounds to cents", () => {
    const p = computePrices([{ unitPrice: 3.33, quantity: 3 }], "USD", {
      taxRatePercent: 7, flatShippingUsd: 0, freeShippingThresholdUsd: 0, discountRatePercent: 0,
    });
    expect(p.subtotal).toBe(9.99);
    expect(p.tax).toBe(0.7);
    expect(p.total).toBe(10.69);
  });
});
