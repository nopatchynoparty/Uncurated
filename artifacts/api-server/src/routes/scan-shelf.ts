import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import multer from "multer";
import { logger } from "../lib/logger.js";

const router = Router();

const MODEL = "claude-sonnet-4-6";
const JOB_TTL_MS = 5 * 60_000;

const SCAN_SYSTEM =
  "You are scanning a bookshelf photo. Identify every book title and author visible on the spines. Respond with ONLY a JSON object — no explanation, no markdown, no code fences. Your response must start with { and end with }. Use this exact format: {\"books\": [{\"title\": \"Title\", \"author\": \"Author\", \"confidence\": \"high\"}], \"unreadable_count\": 0}. Set confidence to \"high\" for clearly readable spines and \"medium\" for partially readable ones. Set unreadable_count to the number of spines you cannot read at all. Do not include any text before the opening { or after the closing }.";

interface ScanBook {
  title: string;
  author: string;
  confidence: "high" | "medium";
}

interface ScanResult {
  books: ScanBook[];
  unreadable_count: number;
}

interface JobFile {
  createdAt: number;
  result?: ScanResult | { error: string };
}

function jobPath(jobId: string): string {
  return path.join("/tmp", `scan-${jobId}.json`);
}

async function writeJob(jobId: string, data: JobFile): Promise<void> {
  await fs.writeFile(jobPath(jobId), JSON.stringify(data), "utf8");
}

async function readJob(jobId: string): Promise<JobFile | null> {
  try {
    return JSON.parse(await fs.readFile(jobPath(jobId), "utf8")) as JobFile;
  } catch {
    return null;
  }
}

// Delete job files older than 5 minutes every 60 seconds.
// All autoscale instances share /tmp, so any instance can clean up.
setInterval(async () => {
  try {
    const files = await fs.readdir("/tmp");
    const cutoff = Date.now() - JOB_TTL_MS;
    for (const f of files) {
      if (!f.startsWith("scan-") || !f.endsWith(".json")) continue;
      const p = path.join("/tmp", f);
      try {
        const job = JSON.parse(await fs.readFile(p, "utf8")) as JobFile;
        if (job.createdAt < cutoff) await fs.unlink(p);
      } catch { /* already gone */ }
    }
  } catch { /* ignore */ }
}, 60_000).unref();

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env["CLAUDE_API_KEY"];
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

async function runScan(
  jobId: string,
  createdAt: number,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  base64Data: string,
): Promise<void> {
  const client = getClient();
  if (!client) {
    await writeJob(jobId, { createdAt, result: { error: "CLAUDE_API_KEY is not configured." } });
    return;
  }

  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: "text", text: SCAN_SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64Data },
              },
            ],
          },
        ],
      },
      { timeout: 90_000 },
    );

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    const cleaned =
      start !== -1 && end > start
        ? raw.slice(start, end + 1)
        : raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let parsed: ScanResult;
    try {
      parsed = JSON.parse(cleaned) as ScanResult;
    } catch {
      logger.error({ raw }, "Failed to parse shelf scan JSON");
      await writeJob(jobId, { createdAt, result: { error: "Couldn't read the bookshelf. Please try a clearer photo." } });
      return;
    }

    if (!Array.isArray(parsed.books)) {
      await writeJob(jobId, { createdAt, result: { error: "Unexpected scanner response. Please try again." } });
      return;
    }

    const books: ScanBook[] = parsed.books
      .filter((b) => b.title && typeof b.title === "string")
      .map((b) => ({
        title: String(b.title).slice(0, 200),
        author: String(b.author ?? "").slice(0, 200),
        confidence: b.confidence === "medium" ? "medium" : "high",
      }));

    await writeJob(jobId, {
      createdAt,
      result: {
        books,
        unreadable_count:
          typeof parsed.unreadable_count === "number"
            ? Math.max(0, Math.round(parsed.unreadable_count))
            : 0,
      },
    });
  } catch (err) {
    logger.error({ err }, "Shelf scan error");
    await writeJob(jobId, { createdAt, result: { error: "Something went wrong scanning your shelf. Please try again." } });
  }
}

// Accepts multipart/form-data (field "image", binary JPEG/PNG/WebP)
// or application/json (field "image", base64 data URL).
// Multipart sends raw binary so the payload is ~33% smaller than base64 JSON,
// which helps clear Replit's proxy body-size limit.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10_000_000 } });

// POST /api/scan-shelf — validates the image, writes a pending job file,
// fires the Anthropic call in the background, returns the jobId immediately.
router.post("/scan-shelf", upload.single("image"), async (req, res) => {
  let mediaType: "image/jpeg" | "image/png" | "image/webp";
  let base64Data: string;

  if (req.file) {
    // multipart upload — raw binary, convert to base64 for Anthropic
    const mime = req.file.mimetype;
    if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
      res.status(400).json({ error: "Invalid image format. Please use a JPEG, PNG, or WebP photo." });
      return;
    }
    mediaType = mime;
    base64Data = req.file.buffer.toString("base64");
  } else {
    // JSON body with data URL
    const { image } = req.body as { image?: string };
    if (!image || typeof image !== "string") {
      res.status(400).json({ error: "No image provided." });
      return;
    }
    const match = image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      res.status(400).json({ error: "Invalid image format. Please use a JPEG, PNG, or WebP photo." });
      return;
    }
    mediaType = match[1] as "image/jpeg" | "image/png" | "image/webp";
    base64Data = match[2];
  }

  if (base64Data.length > 10_000_000) {
    res.status(400).json({ error: "Image too large. Please use a smaller photo (under ~6MB)." });
    return;
  }

  const jobId = randomUUID();
  const createdAt = Date.now();
  await writeJob(jobId, { createdAt });
  void runScan(jobId, createdAt, mediaType, base64Data);
  res.json({ jobId });
});

// GET /api/scan-shelf/status/:jobId — returns { pending: true } while running, or the result.
router.get("/scan-shelf/status/:jobId", async (req, res) => {
  const job = await readJob(req.params["jobId"]!);
  if (!job) {
    res.status(404).json({ error: "Scan job not found or expired." });
    return;
  }
  if (!job.result) {
    res.json({ pending: true });
    return;
  }
  const result = job.result;
  await fs.unlink(jobPath(req.params["jobId"]!)).catch(() => {});
  res.json(result);
});

export default router;
