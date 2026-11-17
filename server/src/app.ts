import express, { type Express } from "express";
import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { errorHandler, notFoundHandler } from "./http/errors.js";
import type { Logger } from "./logger.js";
import { createRouter } from "./routes/index.js";

export function createApp(logger: Logger, deps: Parameters<typeof createRouter>[0]): Express {
  const app = express();
  app.disable("x-powered-by");

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers["x-request-id"] as string | undefined) ?? randomUUID();
        res.setHeader("x-request-id", id);
        return id;
      },
      serializers: {
        req: (req) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(express.json({ limit: "100kb" }));

  app.use(createRouter(deps));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
