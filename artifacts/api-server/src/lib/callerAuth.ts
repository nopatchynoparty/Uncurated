import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { type RequestHandler } from "express";

const SECRET =
  process.env["CALLER_AUTH_SECRET"] ?? randomBytes(32).toString("hex");

const SESSION_COOKIE = "uncurated_sid";
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const SESSION_QUOTA = 20;
const QUOTA_WINDOW_MS = 24 * 60 * 60 * 1000;

interface QuotaEntry {
  count: number;
  resetAt: number;
}

const quotaMap = new Map<string, QuotaEntry>();

function pruneQuotaMap(): void {
  const now = Date.now();
  for (const [id, entry] of quotaMap) {
    if (now >= entry.resetAt) quotaMap.delete(id);
  }
}

function consumeQuota(sessionId: string): boolean {
  pruneQuotaMap();
  const now = Date.now();
  let entry = quotaMap.get(sessionId);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + QUOTA_WINDOW_MS };
  }
  if (entry.count >= SESSION_QUOTA) return false;
  entry.count++;
  quotaMap.set(sessionId, entry);
  return true;
}

function csrfToken(sessionId: string): string {
  return createHmac("sha256", SECRET).update(sessionId).digest("hex");
}

export const issueSession: RequestHandler = (req, res) => {
  let sessionId: string = req.cookies?.[SESSION_COOKIE] ?? "";
  const isNew = typeof sessionId !== "string" || sessionId.length === 0;

  if (isNew) {
    sessionId = randomBytes(32).toString("hex");
    const isSecure =
      req.secure || req.headers["x-forwarded-proto"] === "https";
    res.cookie(SESSION_COOKIE, sessionId, {
      httpOnly: true,
      sameSite: "strict",
      secure: isSecure,
      maxAge: SESSION_MAX_AGE_MS,
      path: "/",
    });
  }

  res.json({ token: csrfToken(sessionId) });
};

export const requireCallerToken: RequestHandler = (req, res, next) => {
  const sessionId: unknown = req.cookies?.[SESSION_COOKIE];
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    res
      .status(401)
      .json({ error: "Session missing. Please refresh and try again." });
    return;
  }

  const provided = req.headers["x-caller-token"];
  if (typeof provided !== "string" || provided.length === 0) {
    res.status(401).json({ error: "Missing caller token." });
    return;
  }

  const expected = Buffer.from(csrfToken(sessionId));
  const actual = Buffer.alloc(expected.length);
  Buffer.from(provided).copy(actual);

  if (!timingSafeEqual(expected, actual)) {
    res.status(401).json({ error: "Invalid caller token." });
    return;
  }

  if (!consumeQuota(sessionId)) {
    res.status(429).json({
      error:
        "You have reached your daily recommendation limit. Please try again tomorrow.",
    });
    return;
  }

  next();
};
