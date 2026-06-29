import { NextRequest, NextResponse } from "next/server";

// Per-route limits: [max requests, window in ms]
const LIMITS: Record<string, [number, number]> = {
  "/api/recommendations":         [10, 60_000],
  "/api/recommendations/replace": [30, 60_000],
  "/api/scan-shelf":              [5,  60_000],
  "/api/email":                   [3,  60_000],
};

const store = new Map<string, { count: number; reset: number }>();

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const limit = LIMITS[path];
  if (!limit) return NextResponse.next();

  const [max, window] = limit;
  const ip =
    req.ip ??
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown";
  const key = `${ip}:${path}`;
  const now = Date.now();

  const entry = store.get(key);
  if (!entry || now > entry.reset) {
    store.set(key, { count: 1, reset: now + window });
    return NextResponse.next();
  }

  if (entry.count >= max) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a minute and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((entry.reset - now) / 1000)) },
      },
    );
  }

  entry.count++;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
