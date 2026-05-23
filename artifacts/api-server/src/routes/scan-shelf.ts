import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

const MODEL = "claude-sonnet-4-6";

const SCAN_SYSTEM =
  "Look at this bookshelf image carefully. Identify every book title and author you can read clearly from the spines. Only include books you can read with reasonable confidence — do not guess at unclear text. Return ONLY valid JSON: { \"books\": [{\"title\": \"...\", \"author\": \"...\", \"confidence\": \"high\" or \"medium\"}], \"unreadable_count\": 5 }";

interface ScanBook {
  title: string;
  author: string;
  confidence: "high" | "medium";
}

interface ScanResult {
  books: ScanBook[];
  unreadable_count: number;
}

// Singleton — one HTTP client for the lifetime of the process
let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env["CLAUDE_API_KEY"];
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

router.post("/scan-shelf", async (req, res) => {
  const client = getClient();
  if (!client) {
    res.status(500).json({ error: "CLAUDE_API_KEY is not configured." });
    return;
  }

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

  const mediaType = match[1] as "image/jpeg" | "image/png" | "image/webp";
  const base64Data = match[2];

  // base64 of a 7MB image is ~9.3M chars
  if (base64Data.length > 10_000_000) {
    res.status(400).json({ error: "Image too large. Please use a smaller photo (under ~6MB)." });
    return;
  }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 512,
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
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsed: ScanResult;
    try {
      parsed = JSON.parse(cleaned) as ScanResult;
    } catch {
      req.log.error({ raw }, "Failed to parse shelf scan JSON");
      res.status(502).json({ error: "Couldn't read the bookshelf. Please try a clearer photo." });
      return;
    }

    if (!Array.isArray(parsed.books)) {
      res.status(502).json({ error: "Unexpected scanner response. Please try again." });
      return;
    }

    const books: ScanBook[] = parsed.books
      .filter((b) => b.title && typeof b.title === "string")
      .map((b) => ({
        title: String(b.title).slice(0, 200),
        author: String(b.author ?? "").slice(0, 200),
        confidence: b.confidence === "medium" ? "medium" : "high",
      }));

    res.json({
      books,
      unreadable_count:
        typeof parsed.unreadable_count === "number"
          ? Math.max(0, Math.round(parsed.unreadable_count))
          : 0,
    });
  } catch (err) {
    req.log.error({ err }, "Shelf scan error");
    res.status(502).json({ error: "Something went wrong scanning your shelf. Please try again." });
  }
});

export default router;
