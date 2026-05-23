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
  format?: string;
  mood?: string;
}

interface ReplaceRequest {
  items: RatedItem[];
  exclude: string[];
  currentlyShown: string[];
  category: string;
  dismissReason?: string;
  format?: string;
  mood?: string;
}

interface Recommendation {
  title: string;
  author: string;
  match_score: number;
  why: string;
  vibe: string;
  amazon_search: string;
  format?: string;
  runtime?: string;
  where_to_watch?: string;
  year?: string;
}

interface RecommendationResponse {
  taste_profile: string;
  short_taste_profile?: string;
  recommendations: Recommendation[];
}

const MODEL = "claude-sonnet-4-6";
const CLAUDE_TIMEOUT_MS = 30_000;
const AFFILIATE_TAG = "uncuratedapp-20";

// Singleton — one HTTP client for the lifetime of the process
let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env["CLAUDE_API_KEY"];
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

// ── Static system prompts (cached by the Claude API across requests) ──────────

const BOOKS_RECS_SYSTEM = `You are an honest, agenda-free books recommendation engine. You have no commercial affiliations, no sponsored content, and no hidden agenda. Your only goal is to understand someone's taste and give them genuinely useful recommendations.

Rating key:
- loved: they adored it
- liked: they enjoyed it
- meh: it didn't connect with them
- abandoned: they couldn't finish it
- hated: they finished it but strongly disliked it
- unrated: no opinion provided

Based on these ratings, analyze their taste and recommend 5 books they are very likely to love.

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "taste_profile": "A 2-3 sentence honest description of their reading taste and what makes them tick as a reader.",
  "short_taste_profile": "One punchy complete sentence under 120 characters distilling their taste for sharing. Must end with a full stop. Never use '...' or ellipsis. Example: 'A fast-paced military sci-fi reader who wants stakes, action, and protagonists who never quit.'",
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
- short_taste_profile must be exactly one complete sentence, maximum 120 characters, ending with a full stop — never use '...' or ellipsis, never truncated mid-sentence
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

const PODCASTS_RECS_SYSTEM = `You are an honest, agenda-free podcast recommendation engine. You have no commercial affiliations, no sponsored content, and no hidden agenda. Your only goal is to understand someone's taste and give them genuinely useful podcast recommendations.

Rating key:
- loved: they adored it
- liked: they enjoyed it
- meh: it didn't connect with them
- abandoned: they couldn't finish it (DNF)
- hated: they finished it but strongly disliked it
- unrated: no opinion provided

Based on these ratings, analyze their listening taste and recommend 5 podcasts they are very likely to love.

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "taste_profile": "A 2-3 sentence honest description of their listening taste and what makes them tick as a listener.",
  "recommendations": [
    {
      "title": "Podcast Title",
      "author": "Host or Creator Name",
      "match_score": 87,
      "why": "One or two sentences explaining why this fits their specific taste based on what they loved and did not love.",
      "vibe": "A short evocative phrase (e.g. deep-dive investigative journalism or breezy science storytelling)",
      "amazon_search": "https://open.spotify.com/search/Podcast%20Title"
    }
  ]
}

Rules:
- match_score must be a number between 60 and 99
- Do not recommend anything the user has already listed
- amazon_search must be a valid Spotify search URL in the format https://open.spotify.com/search/Podcast%20Title with the podcast title URL-encoded in the path
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

const WATCH_RECS_SYSTEM = `You are an honest, agenda-free TV and film recommendation engine. You have no commercial affiliations, no sponsored content, and no hidden agenda. Your only goal is to understand someone's taste and give them genuinely useful recommendations.

Rating key:
- loved: they adored it
- liked: they enjoyed it
- meh: it didn't connect with them
- abandoned: they couldn't finish it (DNF)
- hated: they finished it but strongly disliked it
- unrated: no opinion provided

Based on these ratings and preferences, analyze their taste and recommend 5 TV shows or films they are very likely to love.

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "taste_profile": "A 2-3 sentence honest description of their viewing taste and what makes them tick as a viewer.",
  "recommendations": [
    {
      "title": "Show or Film Title",
      "author": "Director or Creator Name",
      "match_score": 87,
      "why": "One or two sentences explaining why this fits their specific taste based on what they loved and did not love.",
      "vibe": "A short evocative phrase (e.g. slow-burn psychological thriller or warm ensemble comedy)",
      "format": "Series",
      "runtime": "3 seasons ~30hrs",
      "where_to_watch": "Netflix",
      "year": "2019"
    }
  ]
}

Rules:
- match_score must be a number between 60 and 99
- Do not recommend anything the user has already listed
- format must be exactly "Series" or "Film"
- runtime should be concise: for series use "X seasons ~Xhr", for films use "Xhr film"
- where_to_watch should list the primary streaming platform(s). If on multiple, list up to 2 separated by " / "
- year should be the release year as a 4-digit string
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

const BOOKS_REPLACE_SYSTEM = `You are an honest, agenda-free books recommendation engine with no commercial agenda.

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
- amazon_search must be a valid Amazon search URL (amazon.co.uk) with the book title and author URL-encoded
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

const PODCASTS_REPLACE_SYSTEM = `You are an honest, agenda-free podcast recommendation engine with no commercial agenda.

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "title": "Podcast Title",
  "author": "Host or Creator Name",
  "match_score": 87,
  "why": "One or two sentences explaining why this fits their specific taste.",
  "vibe": "A short evocative phrase",
  "amazon_search": "https://open.spotify.com/search/Podcast%20Title"
}

Rules:
- match_score must be a number between 60 and 99
- The title must not appear in either list above in any form
- amazon_search must be a valid Spotify search URL in the format https://open.spotify.com/search/Podcast%20Title with the podcast title URL-encoded in the path
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

const WATCH_REPLACE_SYSTEM = `You are an honest, agenda-free TV and film recommendation engine with no commercial agenda.

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "title": "Show or Film Title",
  "author": "Director or Creator Name",
  "match_score": 87,
  "why": "One or two sentences explaining why this fits their specific taste.",
  "vibe": "A short evocative phrase",
  "format": "Series",
  "runtime": "3 seasons ~30hrs",
  "where_to_watch": "Netflix",
  "year": "2019"
}

Rules:
- match_score must be a number between 60 and 99
- The title must not appear in either list above in any form
- format must be exactly "Series" or "Film"
- runtime should be concise: for series use "X seasons ~Xhr", for films use "Xhr film"
- where_to_watch should list the primary streaming platform(s). If on multiple, list up to 2 separated by " / "
- year should be the release year as a 4-digit string
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

// ── URL helpers ───────────────────────────────────────────────────────────────

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

function sanitizePodcastUrl(url: string, title: string): string {
  try {
    const parsed = new URL(url);
    if (
      parsed.protocol === "https:" &&
      parsed.hostname === "open.spotify.com" &&
      parsed.pathname.startsWith("/search/")
    ) {
      return url;
    }
  } catch {
    // fall through to default
  }
  return `https://open.spotify.com/search/${encodeURIComponent(title)}`;
}

function parseClaudeJson<T>(raw: string): T {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  return JSON.parse(cleaned) as T;
}

// ── Dynamic user message builders ────────────────────────────────────────────

function buildRecsUserMessage(items: RatedItem[], category: string): string {
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");
  if (category === "podcasts") {
    return `Here are the podcasts this person has listened to, along with their ratings:\n\n${itemLines}`;
  }
  return `Here are the books this person has read, along with their ratings:\n\n${itemLines}`;
}

function buildWatchRecsUserMessage(items: RatedItem[], format: string, mood: string): string {
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");
  const formatNote =
    format === "series" ? "Series only (no films)"
    : format === "films" ? "Films only (no series)"
    : "Both series and films welcome";
  const moodNote =
    mood === "light" ? "Light/uplifting tone preferred"
    : mood === "dark" ? "Dark/serious tone preferred"
    : "No mood preference";
  return `User preferences:\n- Format: ${formatNote}\n- Mood: ${moodNote}\n\nHere are the TV shows and films this person has watched, along with their ratings:\n\n${itemLines}`;
}

function buildReplaceUserMessage(
  items: RatedItem[],
  exclude: string[],
  currentlyShown: string[],
  category: string,
  dismissReason?: string,
): string {
  const isPodcast = category === "podcasts";
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");
  const verbPast = isPodcast ? "listened to" : "read";
  const thingLabel = isPodcast ? "podcasts" : "books";
  const checkWord = isPodcast ? "podcast" : "book";

  const allForbidden = [...items.map((i) => i.name), ...exclude];
  const forbiddenLines = [...new Set(allForbidden.map((t) => t.toLowerCase()))]
    .map((t) => `- "${t}"`)
    .join("\n");
  const shownLines =
    currentlyShown.length > 0
      ? currentlyShown.map((t) => `- "${t}"`).join("\n")
      : "(none)";

  const dismissContext = dismissReason
    ? `\nThe user passed on the previous recommendation because: "${dismissReason}". Use this to find a better fit — if they said "Already listen to it", they know the space and want something more niche; if "Not my kind of host", avoid similar presenting styles or formats; if "Too mainstream", lean toward under-the-radar picks; if "Not interested in the topic", steer clear of that subject area entirely.\n`
    : "";

  return `Here are the ${thingLabel} this person has ${verbPast}, along with their ratings:

${itemLines}

Rating key: loved = adored it, liked = enjoyed it, meh = did not connect, abandoned = could not finish, hated = finished but strongly disliked, unrated = no opinion.
${dismissContext}
FORBIDDEN TITLES — do not suggest any of these under any circumstances. Treat a title as forbidden if it matches in any form, including with or without a series prefix, subtitle, or punctuation differences:
${forbiddenLines}

CURRENTLY SHOWN — these are already visible to the user right now and must also not be suggested:
${shownLines}

Recommend exactly ONE ${thingLabel} that does not appear in either list above and fits this person's taste.

Before responding, silently check your chosen title against every item in both lists above. If there is any match — even a partial or reformatted one — pick a different ${checkWord}. Only respond when you are certain the title is not in either list.`;
}

function buildWatchReplaceUserMessage(
  items: RatedItem[],
  exclude: string[],
  currentlyShown: string[],
  format: string,
  mood: string,
  dismissReason?: string,
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

  const formatNote =
    format === "series" ? "Series only (no films)"
    : format === "films" ? "Films only (no series)"
    : "Both series and films welcome";
  const moodNote =
    mood === "light" ? "Light/uplifting tone preferred"
    : mood === "dark" ? "Dark/serious tone preferred"
    : "No mood preference";

  const dismissContext = dismissReason
    ? `\nThe user passed on the previous recommendation because: "${dismissReason}". Use this to find a better fit — if they said "Already watched it", find something with similar appeal they haven't seen; if "Too long a commitment", prefer shorter runtime (a film or a short series); if "Not available on my platforms", aim for widely available platforms like Netflix or Prime Video; if "Not my kind of tone", avoid similar atmosphere or genre feel; if "Not interested in the topic", steer clear of that subject area entirely.\n`
    : "";

  return `User preferences:\n- Format: ${formatNote}\n- Mood: ${moodNote}
${dismissContext}
Here are the shows and films this person has watched, along with their ratings:

${itemLines}

Rating key: loved = adored it, liked = enjoyed it, meh = did not connect, abandoned = could not finish, hated = finished but strongly disliked, unrated = no opinion.

FORBIDDEN TITLES — do not suggest any of these under any circumstances. Treat a title as forbidden if it matches in any form, including with or without a series prefix, subtitle, or punctuation differences:
${forbiddenLines}

CURRENTLY SHOWN — these are already visible to the user right now and must also not be suggested:
${shownLines}

Recommend exactly ONE show or film that does not appear in either list above and fits this person's taste.

Before responding, silently check your chosen title against every item in both lists above. If there is any match — even a partial or reformatted one — pick a different title. Only respond when you are certain the title is not in either list.`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

router.post("/recommendations", async (req, res) => {
  const client = getClient();
  if (!client) {
    res.status(500).json({ error: "CLAUDE_API_KEY is not configured." });
    return;
  }

  const { items, category = "books", format = "both", mood = "any" } = req.body as RecommendationRequest;

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

  const systemPrompt =
    category === "podcasts" ? PODCASTS_RECS_SYSTEM
    : category === "watch" ? WATCH_RECS_SYSTEM
    : BOOKS_RECS_SYSTEM;

  const userMessage =
    category === "watch"
      ? buildWatchRecsUserMessage(items, format, mood)
      : buildRecsUserMessage(items, category);

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
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
      amazon_search: category === "podcasts"
        ? sanitizePodcastUrl(rec.amazon_search ?? "", rec.title)
        : category === "watch"
          ? ""
          : sanitizeAmazonUrl(rec.amazon_search ?? "", rec.title, rec.author),
    }));

    res.json(parsed);
  } catch (err: unknown) {
    clearTimeout(timer);
    req.log.error({ err }, "Claude API error");
    res.status(502).json({ error: "Something went wrong reaching the AI. Please try again." });
  }
});

router.post("/recommendations/replace", async (req, res) => {
  const client = getClient();
  if (!client) {
    res.status(500).json({ error: "CLAUDE_API_KEY is not configured." });
    return;
  }

  const {
    items,
    exclude = [],
    currentlyShown = [],
    category = "books",
    dismissReason,
    format = "both",
    mood = "any",
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

  const systemPrompt =
    category === "podcasts" ? PODCASTS_REPLACE_SYSTEM
    : category === "watch" ? WATCH_REPLACE_SYSTEM
    : BOOKS_REPLACE_SYSTEM;

  const userMessage =
    category === "watch"
      ? buildWatchReplaceUserMessage(items, exclude, currentlyShown, format, mood, dismissReason)
      : buildReplaceUserMessage(items, exclude, currentlyShown, category, dismissReason);

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), CLAUDE_TIMEOUT_MS);

  try {
    const message = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 512,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
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

    rec.amazon_search = category === "podcasts"
      ? sanitizePodcastUrl(rec.amazon_search ?? "", rec.title)
      : category === "watch"
        ? ""
        : sanitizeAmazonUrl(rec.amazon_search ?? "", rec.title, rec.author);

    res.json({ recommendation: rec });
  } catch (err: unknown) {
    clearTimeout(timer);
    req.log.error({ err }, "Claude API replace error");
    res.status(502).json({ error: "Something went wrong reaching the AI. Please try again." });
  }
});

export default router;
