import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

const MODEL = "claude-sonnet-4-6";

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

export async function POST(request: Request) {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  let mediaType: "image/jpeg" | "image/png" | "image/webp";
  let base64Data: string;

  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return Response.json({ error: "No image provided." }, { status: 400 });
    }
    const mime = file.type;
    if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "image/webp") {
      return Response.json(
        { error: "Invalid image format. Please use a JPEG, PNG, or WebP photo." },
        { status: 400 },
      );
    }
    mediaType = mime as "image/jpeg" | "image/png" | "image/webp";
    const buffer = Buffer.from(await file.arrayBuffer());
    base64Data = buffer.toString("base64");
  } else {
    // JSON body with data URL
    const body = (await request.json()) as { image?: string };
    if (!body.image || typeof body.image !== "string") {
      return Response.json({ error: "No image provided." }, { status: 400 });
    }
    const match = body.image.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!match) {
      return Response.json(
        { error: "Invalid image format. Please use a JPEG, PNG, or WebP photo." },
        { status: 400 },
      );
    }
    mediaType = match[1] as "image/jpeg" | "image/png" | "image/webp";
    base64Data = match[2];
  }

  if (base64Data.length > 10_000_000) {
    return Response.json(
      { error: "Image too large. Please use a smaller photo (under ~6MB)." },
      { status: 400 },
    );
  }

  const client = new Anthropic({ apiKey });

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
      { timeout: 55_000 },
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
      console.error("Failed to parse shelf scan JSON", { raw });
      return Response.json(
        { error: "Couldn't read the bookshelf. Please try a clearer photo." },
        { status: 502 },
      );
    }

    if (!Array.isArray(parsed.books)) {
      return Response.json(
        { error: "Unexpected scanner response. Please try again." },
        { status: 502 },
      );
    }

    const books: ScanBook[] = parsed.books
      .filter((b) => b.title && typeof b.title === "string")
      .map((b) => ({
        title: String(b.title).slice(0, 200),
        author: String(b.author ?? "").slice(0, 200),
        confidence: b.confidence === "medium" ? "medium" : "high",
      }));

    return Response.json({
      books,
      unreadable_count:
        typeof parsed.unreadable_count === "number"
          ? Math.max(0, Math.round(parsed.unreadable_count))
          : 0,
    });
  } catch (err) {
    console.error("Shelf scan error", err);
    return Response.json(
      { error: "Something went wrong scanning your shelf. Please try again." },
      { status: 502 },
    );
  }
}
