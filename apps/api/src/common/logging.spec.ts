import { describe, expect, it, vi, afterEach } from "vitest";
import { EventEmitter } from "node:events";
import { CorrelationService } from "./correlation.service";
import { StructuredLogger, redact } from "./structured-logger";
import { RequestIdMiddleware } from "./request-id.middleware";

afterEach(() => vi.restoreAllMocks());

function captureLogger(correlation: CorrelationService) {
  const lines: string[] = [];
  vi.spyOn(console, "log").mockImplementation((line: string) => lines.push(line));
  const logger = new StructuredLogger("api", correlation);
  return { logger, lines };
}

describe("redact (§65 — never log secrets)", () => {
  it("masks sensitive keys recursively without mutating the original", () => {
    const input = {
      password: "hunter2",
      token: "jwt-abc",
      cardNumber: "4111111111111111",
      cvv: "123",
      user: { apiKey: "FAKE_SECRET_KEY_123" },
      ok: "keep-me",
    };
    const original = JSON.parse(JSON.stringify(input));
    const out = redact(input) as Record<string, any>;
    expect(out.password).toBe("***");
    expect(out.token).toBe("***");
    expect(out.cardNumber).toBe("***");
    expect(out.cvv).toBe("***");
    expect(out.user.apiKey).toBe("***");
    expect(out.ok).toBe("keep-me");
    expect(input).toEqual(original); // untouched
  });

  it("masks secret-like values inside plain strings", () => {
    const liveKey = "sk_" + "live_" + "a".repeat(20); // built dynamically (guard rejects literal sk_live_ in source)
    expect(redact(`key ${liveKey} x`)).not.toContain(liveKey);
    expect(redact("Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abcdefghijklmnopqrstuvwxyz")).not.toContain("eyJ");
    const awsKey = "AK" + "IA" + "F".repeat(16); // built dynamically: guard rejects literal AKIA… in source
    expect(redact(`${awsKey} x`)).not.toContain(awsKey);
  });
});

describe("StructuredLogger (§65)", () => {
  it("emits JSON with ts/level/service/environment/request_id/user_id/message", () => {
    const correlation = new CorrelationService();
    const { logger, lines } = captureLogger(correlation);
    correlation.run({ requestId: "req-1", userId: "user-7" }, () => {
      logger.log("hello world", "TestService");
    });
    const entry = JSON.parse(lines[0]);
    expect(typeof entry.ts).toBe("string");
    expect(entry.level).toBe("log");
    expect(entry.service).toBe("api");
    expect(entry.environment).toBeDefined();
    expect(entry.request_id).toBe("req-1");
    expect(entry.user_id).toBe("user-7");
    expect(entry.message).toBe("hello world");
    expect(entry.context).toBe("TestService");
  });

  it("logs null correlation outside a request", () => {
    const correlation = new CorrelationService();
    const { logger, lines } = captureLogger(correlation);
    logger.warn("outside request");
    const entry = JSON.parse(lines[0]);
    expect(entry.request_id).toBeNull();
    expect(entry.user_id).toBeNull();
  });

  it("never logs secrets even when they are part of the message/meta", () => {
    const correlation = new CorrelationService();
    const { logger, lines } = captureLogger(correlation);
    correlation.run({ requestId: "r", userId: "u" }, () => {
      logger.error({
        message: "payment failed",
        body: { password: "s3cret", cardNumber: "4111111111111111" },
      }, "Payments");
    });
    expect(lines[0]).not.toContain("s3cret");
    expect(lines[0]).not.toContain("4111111111111111");
    expect(lines[0]).toContain("***");
  });
});

describe("RequestIdMiddleware (§66 — request correlation)", () => {
  it("generates a request id, echoes it, and seeds the correlation context", () => {
    const correlation = new CorrelationService();
    const { logger, lines } = captureLogger(correlation);
    const middleware = new RequestIdMiddleware(correlation, logger);

    let headers: Record<string, string> = {};
    const res = new EventEmitter() as any;
    res.setHeader = (k: string, v: string) => { headers[k] = v; };
    res.statusCode = 200;
    const req: any = {
      headers: {},
      method: "GET",
      url: "/api/v1/products",
      originalUrl: "/api/v1/products",
    };

    middleware.use(req, res, () => {
      // inside the request context
      correlation.setUserId("u-42");
    });
    // EventEmitter 'finish' fires the listener within the request's ALS context
    res.emit("finish");

    expect(req.requestId).toHaveLength(12);
    expect(headers["x-request-id"]).toBe(req.requestId);
    const entry = JSON.parse(lines[0]);
    expect(entry.request_id).toBe(req.requestId);
    expect(entry.user_id).toBe("u-42"); // AuthGuard set it within the request context
    expect(entry.message).toContain("GET /api/v1/products 200");
  });

  it("honors an incoming x-request-id and propagates it back", () => {
    const correlation = new CorrelationService();
    const { logger, lines } = captureLogger(correlation);
    const middleware = new RequestIdMiddleware(correlation, logger);
    const req: any = { headers: { "x-request-id": "edge-abc123" }, method: "GET", url: "/x" };
    const res: any = { setHeader: () => {}, on: () => {} };
    let captured: string | null = null;
    correlation.run({ requestId: null, userId: null }, () => {
      middleware.use(req, res, () => { captured = correlation.get().requestId; });
    });
    expect(captured).toBe("edge-abc123");
    expect(req.requestId).toBe("edge-abc123");
  });
});
