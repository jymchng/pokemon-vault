import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ZodError } from "zod";
import { GlobalErrorFilter } from "./global-error.filter";

function makeHost(res: any, req: any = { method: "GET", url: "/x" }): any {
  return {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => req }),
  };
}

describe("G26 global error filter (§50)", () => {
  it("wraps HttpException into {error:{code,message}}", () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) };
    new GlobalErrorFilter().catch(new NotFoundException("User not found"), makeHost(res));
    expect(res.status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: { code: "NOT_FOUND", message: "User not found" },
    });
  });

  it("maps ZodError to 400 VALIDATION_ERROR with field details", () => {
    const json = vi.fn();
    const res = { status: vi.fn(() => ({ json })) };
    const err = new ZodError([{ code: "custom", message: "Too weak", path: ["password"] }]);
    new GlobalErrorFilter().catch(err, makeHost(res));
    expect(res.status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "VALIDATION_ERROR",
        message: "Validation failed",
        details: [{ path: "password", message: "Too weak" }],
      },
    });
  });

  it("sanitizes unknown errors in production (no stack/SQL/message leak)", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    try {
      const json = vi.fn();
      const res = { status: vi.fn(() => ({ json })) };
      new GlobalErrorFilter().catch(
        new Error("SQL: SELECT * FROM users -- secret connection string /etc/passwd"),
        makeHost(res),
      );
      expect(res.status).toHaveBeenCalledWith(500);
      const body = json.mock.calls[0][0];
      expect(body.error.code).toBe("INTERNAL_ERROR");
      expect(body.error.message).toBe("An unexpected error occurred");
      expect(body.error.message).not.toContain("SQL");
      expect(body.error.message).not.toContain("secret");
      expect(body.error.message).not.toContain("/etc");
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("reveals the message in development but still no stack trace", () => {
    const prev = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    try {
      const json = vi.fn();
      const res = { status: vi.fn(() => ({ json })) };
      new GlobalErrorFilter().catch(new Error("boom detail"), makeHost(res));
      const body = json.mock.calls[0][0];
      expect(body.error.message).toBe("boom detail");
      expect(JSON.stringify(body)).not.toContain("at ");
    } finally {
      process.env.NODE_ENV = prev;
    }
  });

  it("maps common statuses to stable codes", () => {
    const cases: Array<[Error, number, string]> = [
      [new BadRequestException("bad"), 400, "BAD_REQUEST"],
      [new NotFoundException("nf"), 404, "NOT_FOUND"],
      [new ConflictException("conflict"), 409, "CONFLICT"],
    ];
    for (const [exc, status, code] of cases) {
      const json = vi.fn();
      const res = { status: vi.fn(() => ({ json })) };
      new GlobalErrorFilter().catch(exc, makeHost(res));
      expect(res.status).toHaveBeenCalledWith(status);
      expect(json.mock.calls[0][0].error.code).toBe(code);
    }
  });
});
