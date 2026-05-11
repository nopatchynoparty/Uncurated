import express, { type Express } from "express";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireCallerToken } from "./lib/callerAuth";
import { concurrencyLimiter } from "./lib/concurrency";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const recommendationsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

const tokenLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

app.use("/api/recommendations", recommendationsLimiter, requireCallerToken, concurrencyLimiter);
app.use("/api/token", tokenLimiter);
app.use("/api", router);

const publicDir = path.join(__dirname, "../public");
app.use(express.static(publicDir));

app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

export default app;
