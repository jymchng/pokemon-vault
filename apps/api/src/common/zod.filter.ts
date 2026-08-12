import { ArgumentsHost, Catch, ExceptionFilter } from "@nestjs/common";
import { ZodError } from "zod";

/**
 * Converts zod validation errors (thrown by schema.parse in controllers)
 * into a 400 Bad Request with the field-level issues — instead of Nest's
 * default 500 Internal Server Error for unhandled exceptions.
 */
@Catch(ZodError)
export class ZodErrorFilter implements ExceptionFilter {
  catch(exception: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status: (code: number) => { json: (body: unknown) => void } }>();
    res.status(400).json({
      statusCode: 400,
      error: "Bad Request",
      message: "Validation failed",
      issues: exception.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
}
