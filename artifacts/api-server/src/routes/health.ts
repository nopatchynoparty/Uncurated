import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { issueSession } from "../lib/callerAuth";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/token", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
}, issueSession);

export default router;
