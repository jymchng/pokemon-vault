import { ZodError } from "zod";
import { ZodErrorFilter } from "./zod.filter";

it("zod.filter: converts ZodError into a 400 with field issues", () => {
  const schema = {
    parse: (_value: unknown) => {
      throw new ZodError([{ code: "custom", message: "Too weak", path: ["password"] }]);
    },
  };
  const json = vi.fn();
  const res = { status: vi.fn(() => ({ json })) };
  const host: any = {
    switchToHttp: () => ({ getResponse: () => res }),
  };
  try {
    schema.parse({});
  } catch (err) {
    new ZodErrorFilter().catch(err as ZodError, host);
  }
  expect(res.status).toHaveBeenCalledWith(400);
  expect(json).toHaveBeenCalledWith(
    expect.objectContaining({
      statusCode: 400,
      error: "Bad Request",
      issues: [{ path: "password", message: "Too weak" }],
    }),
  );
});
