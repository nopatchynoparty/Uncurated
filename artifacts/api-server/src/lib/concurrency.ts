import { type RequestHandler } from "express";

const MAX_IN_FLIGHT = 5;
let inFlight = 0;

export const concurrencyLimiter: RequestHandler = (_req, res, next) => {
  if (inFlight >= MAX_IN_FLIGHT) {
    res.status(503).json({
      error: "The service is busy. Please try again in a moment.",
    });
    return;
  }
  inFlight++;
  let released = false;
  const release = () => {
    if (!released) {
      released = true;
      inFlight = Math.max(0, inFlight - 1);
    }
  };
  res.on("finish", release);
  res.on("close", release);
  next();
};
