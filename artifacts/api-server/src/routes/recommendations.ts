import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

interface RatedItem {
  name: string;
  rating: "loved" | "liked" | "meh" | "abandoned" | "unrated";
}

interface RecommendationRequest {
  items: RatedItem[];
  category: string;
}

interface ReplaceRequest {
  items: RatedItem[];
  exclude: string[];
  category: string;
}

interface Recommendation {
  title: string;
  author: string;
  match_score: number;
  why: string;
  vibe: string;
  amazon_search: string;
}

interface RecommendationResponse {
  taste_profile: string;
  recommendations: Recommendation[];
}

function parseClaudeJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

function buildPrompt(items: RatedItem[], category: string): string {
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");

  return `You are an honest, agenda-free ${category} recommendation engine. You have no commercial affiliations, no sponsored content, and no hidden agenda. Your only goal is to understand someone's taste and give them genuinely useful recommendations.

Here are the ${category} this person has read, along with their ratings:

${itemLines}

Rating key:
- loved: they adored it
- liked: they enjoyed it
- meh: it didn't connect with them
- abandoned: they couldn't finish it
- unrated: no opinion provided

Based on these ratings, analyze their taste and recommend 5 ${category} they are very likely to love.

Respond ONLY with valid JSON — no markdown, no explanation, no code fences. Use exactly this shape:

{
  "taste_profile": "A 2–3 sentence honest description of their reading taste and what makes them tick as a reader.",
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "match_score": 87,
      "why": "One or two sentences explaining why this fits their specific taste based on what they loved and didn't love.",
      "vibe": "A short evocative phrase (e.g. 'slow-burn literary fiction' or 'propulsive thriller')",
      "amazon_search": "https://www.amazon.com/s?k=Book+Title+Author+Name"
    }
  ]
}

Rules:
- match_score must be a number between 60 and 99
- Do not recommend anything the user has already listed
- Do not include any text outside the JSON object
- amazon_search must be a valid Amazon search URL with the book title and author encoded`;
}

function buildReplacePrompt(
  items: RatedItem[],
  exclude: string[],
  category: string,
): string {
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");

  const allForbidden = [...items.map((i) => i.name), ...exclude];
  const forbiddenLines = [...new Set(allForbidden.map((t) => t.toLowerCase()))]
    .map((t) => `- "${t}"`)
    .join("\n");

  return `You are an honest, agenda-free ${category} recommendation engine with no commercial agenda.

Here are the ${category} this person has read, along with their ratings:

${itemLines}

Rating key: loved = adored it, liked = enjoyed it, meh = didn't connect, abandoned = couldn't finish, unrated = no opinion.

CRITICAL — the following titles are FORBIDDEN. Do not suggest any of them under any circumstances, even if they seem like a perfect fit:
${forbiddenLines}

Recommend exactly ONE ${category} that is NOT on the forbidden list above and fits this person's taste.

Respond ONLY with valid JSON — no markdown, no explanation, no code fences. Use exactly this shape:

{
  "title": "Book Title",
  "author": "Author Name",
  "match_score": 87,
  "why": "One or two sentences explaining why this fits their specific taste.",
  "vibe": "A short evocative phrase",
  "amazon_search": "https://www.amazon.com/s?k=Book+Title+Author+Name"
}

Rules:
- match_score must be a number between 60 and 99
- The title MUST NOT appear in the forbidden list above — double-check before responding
- Do not include any text outside the JSON object`;
}

router.post("/recommendations", async (req, res) => {
  const apiKey = process.env["CLAUDE_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "CLAUDE_API_KEY is not configured." });
    return;
  }

  const { items, category = "books" } = req.body as RecommendationRequest;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Please provide at least one item." });
    return;
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 2048,
      messages: [{ role: "user", content: buildPrompt(items, category) }],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: RecommendationResponse;
    try {
      parsed = parseClaudeJson<RecommendationResponse>(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse Claude response as JSON");
      res.status(502).json({
        error: "Received an unexpected response from the AI. Please try again.",
      });
      return;
    }

    if (!parsed.taste_profile || !Array.isArray(parsed.recommendations)) {
      res.status(502).json({
        error: "AI response was missing required fields. Please try again.",
      });
      return;
    }

    res.json(parsed);
  } catch (err: unknown) {
    req.log.error({ err }, "Claude API error");
    const message =
      err instanceof Error ? err.message : "Unknown error from AI service.";
    res.status(502).json({ error: message });
  }
});

router.post("/recommendations/replace", async (req, res) => {
  const apiKey = process.env["CLAUDE_API_KEY"];
  if (!apiKey) {
    res.status(500).json({ error: "CLAUDE_API_KEY is not configured." });
    return;
  }

  const {
    items,
    exclude = [],
    category = "books",
  } = req.body as ReplaceRequest;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Please provide at least one item." });
    return;
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: buildReplacePrompt(items, exclude, category),
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    let rec: Recommendation;
    try {
      rec = parseClaudeJson<Recommendation>(raw);
    } catch {
      req.log.error({ raw }, "Failed to parse Claude replace response as JSON");
      res.status(502).json({
        error: "Received an unexpected response from the AI. Please try again.",
      });
      return;
    }

    if (!rec.title || !rec.author) {
      res.status(502).json({
        error: "AI response was missing required fields. Please try again.",
      });
      return;
    }

    res.json({ recommendation: rec });
  } catch (err: unknown) {
    req.log.error({ err }, "Claude API replace error");
    const message =
      err instanceof Error ? err.message : "Unknown error from AI service.";
    res.status(502).json({ error: message });
  }
});

export default router;
