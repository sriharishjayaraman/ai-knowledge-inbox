import type { ErrorRequestHandler, RequestHandler, Response } from "express";
import { ZodError } from "zod";

// Domain code throws AppError with a code; only this file knows HTTP status codes.
export class AppError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

const STATUS_BY_CODE: Record<string, number> = {
  URL_FETCH_FAILED: 422,
  URL_TOO_LARGE: 422,
  URL_NO_TEXT: 422,
  UNSUPPORTED_CONTENT_TYPE: 422,
  AI_PROVIDER_ERROR: 502,
  AI_RATE_LIMITED: 503,
};

const send = (res: Response, status: number, code: string, message: string, requestId: unknown, details?: unknown) =>
  res.status(status).json({ error: { code, message, details, requestId: String(requestId) } });

export const notFoundHandler: RequestHandler = (req, res) => {
  send(res, 404, "NOT_FOUND", `No route for ${req.method} ${req.path}`, req.id);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ field: i.path.join(".") || "(body)", message: i.message }));
    return send(res, 400, "VALIDATION_ERROR", details.map((d) => d.message).join("; "), req.id, details);
  }
  if (err instanceof AppError) {
    req.log.warn({ code: err.code }, err.message);
    return send(res, STATUS_BY_CODE[err.code] ?? 500, err.code, err.message, req.id);
  }
  if (err?.type === "entity.parse.failed") return send(res, 400, "INVALID_JSON", "Request body is not valid JSON", req.id);
  if (err?.type === "entity.too.large") return send(res, 413, "PAYLOAD_TOO_LARGE", "Request body is too large", req.id);

  req.log.error({ err }, "unhandled error");
  return send(res, 500, "INTERNAL_ERROR", "Something went wrong on our side", req.id);
};
