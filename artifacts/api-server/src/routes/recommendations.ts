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
  currentlyShown: string[];
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

const CLAUDE_TIMEOUT_MS = 30_000;

const AFFILIATE_TAG = "uncuratedapp-21";

function isSafeAmazonUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const validHosts = [
      "www.amazon.co.uk",
      "amazon.co.uk",
      "www.amazon.com",
      "amazon.com",
    ];
    return (
      parsed.protocol === "https:" &&
      validHosts.includes(parsed.hostname) &&
      parsed.pathname === "/s"
    );
  } catch {
    return false;
  }
}

function addAffiliateTag(url: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set("tag", AFFILIATE_TAG);
  return parsed.toString();
}

function sanitizeAmazonUrl(url: string, title: string, author: string): string {
  const base = isSafeAmazonUrl(url)
    ? url
    : `https://www.amazon.co.uk/s?k=${encodeURIComponent(`${title} ${author}`)}`;
  return addAffiliateTag(base);
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

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "taste_profile": "A 2-3 sentence honest description of their reading taste and what makes them tick as a reader.",
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name",
      "match_score": 87,
      "why": "One or two sentences explaining why this fits their specific taste based on what they loved and did not love.",
      "vibe": "A short evocative phrase (e.g. slow-burn literary fiction or propulsive thriller)",
      "amazon_search": "https://www.amazon.co.uk/s?k=Book+Title+Author+Name"
    }
  ]
}

Rules:
- match_score must be a number between 60 and 99
- Do not recommend anything the user has already listed
- amazon_search must be a valid Amazon search URL (amazon.co.uk) with the book title and author URL-encoded
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;
}

function buildReplacePrompt(
  items: RatedItem[],
  exclude: string[],
  currentlyShown: string[],
  category: string,
): string {
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");

  const allForbidden = [...items.map((i) => i.name), ...exclude];
  const forbiddenLines = [...new Set(allForbidden.map((t) => t.toLowerCase()))]
    .map((t) => `- "${t}"`)
    .join("\n");

  const shownLines =
    currentlyShown.length > 0
      ? currentlyShown.map((t) => `- "${t}"`).join("\n")
      : "(none)";

  return `You are an honest, agenda-free ${category} recommendation engine with no commercial agenda.

Here are the ${category} this person has read, along with their ratings:

${itemLines}

Rating key: loved = adored it, liked = enjoyed it, meh = did not connect, abandoned = could not finish, unrated = no opinion.

FORBIDDEN TITLES — do not suggest any of these under any circumstances. Treat a title as forbidden if it matches in any form, including with or without a series prefix, subtitle, or punctuation differences (e.g. "Leviathan Wakes" and "The Expanse: Leviathan Wakes" are the same):
${forbiddenLines}

CURRENTLY SHOWN — these are already visible to the user right now and must also not be suggested:
${shownLines}

Recommend exactly ONE ${category} that does not appear in either list above and fits this person's taste.

Before responding, silently check your chosen title against every item in both lists above. If there is any match — even a partial or reformatted one — pick a different book. Only respond when you are certain the title is not in either list.

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "title": "Book Title",
  "author": "Author Name",
  "match_score": 87,
  "why": "One or two sentences explaining why this fits their specific taste.",
  "vibe": "A short evocative phrase",
  "amazon_search": "https://www.amazon.co.uk/s?k=Book+Title+Author+Name"
}

Rules:
- match_score must be a number between 60 and 99
- The title must not appear in either list above in any form
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;
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
  if (items.length > 500) {
    res.status(400).json({ error: "Too many items. Please provide at most 500." });
    return;
  }
  if (items.some((i) => typeof i.name !== "string" || i.name.length > 200)) {
    res.status(400).json({ error: "Each item name must be 200 characters or fewer." });
    return;
  }

  const client = new Anthropic({ apiKey });
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 2048,
        messages: [{ role: "user", content: buildPrompt(items, category) }],
      },
      { signal: abort.signal },
    );

    clearTimeout(timer);

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

    parsed.recommendations = parsed.recommendations.map((rec) => ({
      ...rec,
      amazon_search: sanitizeAmazonUrl(
        rec.amazon_search,
        rec.title,
        rec.author,
      ),
    }));

    res.json(parsed);
  } catch (err: unknown) {
    clearTimeout(timer);
    req.log.error({ err }, "Claude API error");
    res.status(502).json({ error: "Something went wrong reaching the AI. Please try again." });
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
    currentlyShown = [],
    category = "books",
  } = req.body as ReplaceRequest;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: "Please provide at least one item." });
    return;
  }
  if (items.length > 500) {
    res.status(400).json({ error: "Too many items. Please provide at most 500." });
    return;
  }
  if (items.some((i) => typeof i.name !== "string" || i.name.length > 200)) {
    res.status(400).json({ error: "Each item name must be 200 characters or fewer." });
    return;
  }

  const client = new Anthropic({ apiKey });
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: "claude-sonnet-4-5",
        max_tokens: 512,
        messages: [
          {
            role: "user",
            content: buildReplacePrompt(
              items,
              exclude,
              currentlyShown,
              category,
            ),
          },
        ],
      },
      { signal: abort.signal },
    );

    clearTimeout(timer);

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

    rec.amazon_search = sanitizeAmazonUrl(
      rec.amazon_search,
      rec.title,
      rec.author,
    );

    res.json({ recommendation: rec });
  } catch (err: unknown) {
    clearTimeout(timer);
    req.log.error({ err }, "Claude API replace error");
    res.status(502).json({ error: "Something went wrong reaching the AI. Please try again." });
  }
});

export default router;
