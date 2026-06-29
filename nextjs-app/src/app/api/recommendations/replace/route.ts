import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

interface RatedItem {
  name: string;
  rating: "loved" | "liked" | "meh" | "abandoned" | "hated" | "unrated";
}

interface ReplaceRequest {
  items: RatedItem[];
  exclude: string[];
  currentlyShown: string[];
  category: string;
  dismissReason?: string;
  format?: string;
  mood?: string;
  platform?: string;
  deepCuts?: boolean;
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
  year?: string;
  platform?: string;
  play_time?: string;
  justwatch_search?: string;
}

const REPLACE_MODEL = "claude-haiku-4-5-20251001";
const AFFILIATE_TAG = "uncuratedapp-20";

let _client: Anthropic | null = null;
function getClient(): Anthropic | null {
  const apiKey = process.env["ANTHROPIC_API_KEY"];
  if (!apiKey) return null;
  if (!_client) _client = new Anthropic({ apiKey });
  return _client;
}

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
- The title must not match any forbidden title in any form: ignoring leading "The", "A", or "An"; ignoring any series prefix before a colon or em-dash (e.g. "Series: Title" matches "Title"); ignoring subtitles after a colon or em-dash (e.g. "Title: Subtitle" matches "Title"); ignoring punctuation differences. When in doubt, pick something else.
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
- The title must not match any forbidden title in any form: ignoring leading "The", "A", or "An"; ignoring any series prefix before a colon or em-dash (e.g. "Series: Title" matches "Title"); ignoring subtitles after a colon or em-dash (e.g. "Title: Subtitle" matches "Title"); ignoring punctuation differences. When in doubt, pick something else.
- amazon_search must be a valid Spotify search URL in the format https://open.spotify.com/search/Podcast%20Title with the podcast title URL-encoded in the path
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

const GAMES_REPLACE_SYSTEM = `You are an honest, agenda-free video game recommendation engine with no commercial agenda.

Respond ONLY with valid JSON. Your response must begin with { and end with }. Do not use backticks, markdown, code fences, or any text outside the JSON object. Use exactly this shape:

{
  "title": "Game Title",
  "author": "Studio Name",
  "match_score": 87,
  "why": "One or two sentences explaining why this fits their specific taste.",
  "vibe": "A short evocative phrase",
  "platform": "PC / PlayStation",
  "play_time": "~20hrs",
  "year": "2022",
  "amazon_search": "https://www.amazon.co.uk/s?k=Game+Title+PlayStation"
}

Rules:
- match_score must be a number between 60 and 99
- The title must not match any forbidden title in any form: ignoring leading "The", "A", or "An"; ignoring any series prefix before a colon or em-dash (e.g. "Series: Title" matches "Title"); ignoring subtitles after a colon or em-dash (e.g. "Title: Subtitle" matches "Title"); ignoring punctuation differences. When in doubt, pick something else.
- platform should be the primary platform(s), max 2. Use standard names: PC, PlayStation, Xbox, Switch, iOS, Android — never use "PS5", "PS4", "Xbox Series X", just "PlayStation" or "Xbox"
- play_time should be concise: "~10hrs", "~50hrs", "~200hrs", "Endless" for live service
- year should be the release year as a 4-digit string
- amazon_search must be a valid Amazon search URL (amazon.co.uk) with the game title and primary platform URL-encoded
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
  "year": "2019",
  "justwatch_search": "https://www.justwatch.com/uk/search?q=Show+or+Film+Title"
}

Rules:
- match_score must be a number between 60 and 99
- The title must not match any forbidden title in any form: ignoring leading "The", "A", or "An"; ignoring any series prefix before a colon or em-dash (e.g. "Series: Title" matches "Title"); ignoring subtitles after a colon or em-dash (e.g. "Title: Subtitle" matches "Title"); ignoring punctuation differences. When in doubt, pick something else.
- format must be exactly "Series" or "Film"
- runtime should be concise: for series use "X seasons ~Xhr", for films use "Xhr film"
- year should be the release year as a 4-digit string
- justwatch_search must be a valid JustWatch search URL in the format https://www.justwatch.com/uk/search?q=Title with the title URL-encoded
- Avoid recommending titles so widely seen and discussed that a regular viewer would almost certainly have already watched them. Prioritise underseen, underrated, or less widely talked-about titles over cultural landmarks — unless the dismiss reason or context suggests otherwise.
- Your entire response must be valid JSON starting with { and ending with } — nothing else`;

function isSafeAmazonUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const validHosts = ["www.amazon.co.uk", "amazon.co.uk", "www.amazon.com", "amazon.com"];
    return parsed.protocol === "https:" && validHosts.includes(parsed.hostname) && parsed.pathname === "/s";
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

function sanitizeJustWatchUrl(url: string, title: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname === "www.justwatch.com" && parsed.pathname === "/uk/search") {
      return url;
    }
  } catch { /* fall through */ }
  return `https://www.justwatch.com/uk/search?q=${encodeURIComponent(title)}`;
}

function sanitizePodcastUrl(url: string, title: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "https:" && parsed.hostname === "open.spotify.com" && parsed.pathname.startsWith("/search/")) {
      return url;
    }
  } catch { /* fall through */ }
  return `https://open.spotify.com/search/${encodeURIComponent(title)}`;
}

function parseClaudeJson<T>(raw: string): T {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  return JSON.parse(cleaned) as T;
}

function formatPlatformNote(platform: string): string {
  if (!platform || platform === "all") return "All platforms welcome";
  const labels: Record<string, string> = { pc: "PC", playstation: "PlayStation", switch: "Switch", xbox: "Xbox", mobile: "Mobile" };
  const parts = platform.split(",").map((p) => labels[p] ?? p);
  return parts.length === 1 ? `${parts[0]} only` : `${parts.join(" or ")} only`;
}

function buildReplaceUserMessage(
  items: RatedItem[], exclude: string[], currentlyShown: string[], category: string, dismissReason?: string,
): string {
  const isPodcasts = category === "podcasts";
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");
  const verbPast = isPodcasts ? "listened to" : "read";
  const thingLabel = isPodcasts ? "podcasts" : "books";
  const checkWord = isPodcasts ? "podcast" : "book";

  const allForbidden = [...items.map((i) => i.name), ...exclude];
  const forbiddenLines = Array.from(new Set(allForbidden.map((t) => t.toLowerCase()))).map((t) => `- "${t}"`).join("\n");
  const shownLines = currentlyShown.length > 0 ? currentlyShown.map((t) => `- "${t}"`).join("\n") : "(none)";

  const dismissContext = dismissReason
    ? `\nThe user passed on the previous recommendation because: "${dismissReason}". Use this to find a better fit — if they said "Already listen to it", they know the space and want something more niche; if "Not my kind of host", avoid similar presenting styles or formats; if "Too mainstream", lean toward under-the-radar picks; if "Not interested in the topic", steer clear of that subject area entirely.\n`
    : "";

  return `Here are the ${thingLabel} this person has ${verbPast}, along with their ratings:

${itemLines}

Rating key: loved = adored it, liked = enjoyed it, meh = did not connect, abandoned = could not finish, hated = finished but strongly disliked, unrated = no opinion.
${dismissContext}
FORBIDDEN TITLES — do not suggest any of these under any circumstances. Treat a title as forbidden if it matches in any form: ignoring leading "The", "A", or "An"; ignoring any series prefix before a colon or em-dash (e.g. "Series: Title" matches "Title"); ignoring subtitles after a colon or em-dash (e.g. "Title: Subtitle" matches "Title"); ignoring punctuation differences. When in doubt, pick something else:
${forbiddenLines}

CURRENTLY SHOWN — these are already visible to the user right now and must also not be suggested:
${shownLines}

Recommend exactly ONE ${thingLabel} that does not appear in either list above and fits this person's taste.

Before responding, silently check your chosen title against every item in both lists above. If there is any match — even a partial or reformatted one — pick a different ${checkWord}. Only respond when you are certain the title is not in either list.`;
}

function buildGamesReplaceUserMessage(
  items: RatedItem[], exclude: string[], currentlyShown: string[], platform: string, dismissReason?: string, deepCuts?: boolean,
): string {
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");
  const allForbidden = [...items.map((i) => i.name), ...exclude];
  const forbiddenLines = Array.from(new Set(allForbidden.map((t) => t.toLowerCase()))).map((t) => `- "${t}"`).join("\n");
  const shownLines = currentlyShown.length > 0 ? currentlyShown.map((t) => `- "${t}"`).join("\n") : "(none)";
  const platformNote = formatPlatformNote(platform);
  const deepCutsNote = deepCuts ? "\nThis player games extensively — prioritise hidden gems and underseen titles, avoid anything considered obvious or that has had major mainstream exposure." : "";
  const dismissContext = dismissReason
    ? `\nThe user passed on the previous recommendation because: "${dismissReason}". Use this to find a better fit — if they said "Already played it", find something with similar appeal they haven't played; if "Too long a commitment", prefer shorter games (~10hrs or less); if "Not my kind of genre", avoid similar genre or gameplay feel; if "Not available on my platform", aim for their specified platform; if "Not interested in the theme", steer clear of that subject area entirely.\n`
    : "";

  return `User preferences:\n- Platform: ${platformNote}${deepCutsNote}
${dismissContext}
Here are the games this person has played, along with their ratings:

${itemLines}

Rating key: loved = adored it, liked = enjoyed it, meh = did not connect, abandoned = could not finish, hated = finished but strongly disliked, unrated = no opinion.

FORBIDDEN TITLES — do not suggest any of these under any circumstances. Treat a title as forbidden if it matches in any form: ignoring leading "The", "A", or "An"; ignoring any series prefix before a colon or em-dash (e.g. "Series: Title" matches "Title"); ignoring subtitles after a colon or em-dash (e.g. "Title: Subtitle" matches "Title"); ignoring punctuation differences. When in doubt, pick something else:
${forbiddenLines}

CURRENTLY SHOWN — these are already visible to the user right now and must also not be suggested:
${shownLines}

Recommend exactly ONE game that does not appear in either list above and fits this person's taste.

Before responding, silently check your chosen title against every item in both lists above. If there is any match — even a partial or reformatted one — pick a different game. Only respond when you are certain the title is not in either list.`;
}

function buildWatchReplaceUserMessage(
  items: RatedItem[], exclude: string[], currentlyShown: string[], format: string, mood: string, dismissReason?: string, deepCuts?: boolean,
): string {
  const itemLines = items.map((i) => `- "${i.name}" (${i.rating})`).join("\n");
  const allForbidden = [...items.map((i) => i.name), ...exclude];
  const forbiddenLines = Array.from(new Set(allForbidden.map((t) => t.toLowerCase()))).map((t) => `- "${t}"`).join("\n");
  const shownLines = currentlyShown.length > 0 ? currentlyShown.map((t) => `- "${t}"`).join("\n") : "(none)";
  const formatNote = format === "series" ? "Series only (no films)" : format === "films" ? "Films only (no series)" : "Both series and films welcome";
  const moodNote = mood === "light" ? "Light/uplifting tone preferred" : mood === "dark" ? "Dark/serious tone preferred" : "No mood preference";
  const deepCutsNote = deepCuts ? "\nThis viewer watches extensively — prioritise hidden gems and underseen titles, avoid anything that would be considered obvious or that has had major mainstream cultural exposure." : "";
  const dismissContext = dismissReason
    ? `\nThe user passed on the previous recommendation because: "${dismissReason}". Use this to find a better fit — if they said "Already watched it", find something with similar appeal they haven't seen; if "Too long a commitment", prefer shorter runtime (a film or a short series); if "Not my kind of tone", avoid similar atmosphere or genre feel; if "Not interested in the topic", steer clear of that subject area entirely.\n`
    : "";

  return `User preferences:\n- Format: ${formatNote}\n- Mood: ${moodNote}${deepCutsNote}
${dismissContext}
Here are the shows and films this person has watched, along with their ratings:

${itemLines}

Rating key: loved = adored it, liked = enjoyed it, meh = did not connect, abandoned = could not finish, hated = finished but strongly disliked, unrated = no opinion.

FORBIDDEN TITLES — do not suggest any of these under any circumstances. Treat a title as forbidden if it matches in any form: ignoring leading "The", "A", or "An"; ignoring any series prefix before a colon or em-dash (e.g. "Series: Title" matches "Title"); ignoring subtitles after a colon or em-dash (e.g. "Title: Subtitle" matches "Title"); ignoring punctuation differences. When in doubt, pick something else:
${forbiddenLines}

CURRENTLY SHOWN — these are already visible to the user right now and must also not be suggested:
${shownLines}

Recommend exactly ONE show or film that does not appear in either list above and fits this person's taste.

Before responding, silently check your chosen title against every item in both lists above. If there is any match — even a partial or reformatted one — pick a different title. Only respond when you are certain the title is not in either list.`;
}

export async function POST(request: NextRequest) {
  const client = getClient();
  if (!client) {
    return Response.json({ error: "ANTHROPIC_API_KEY is not configured." }, { status: 500 });
  }

  const body = await request.json() as ReplaceRequest;
  const {
    items,
    exclude = [],
    currentlyShown = [],
    category = "books",
    dismissReason,
    format = "both",
    mood = "any",
    platform = "all",
    deepCuts,
  } = body;

  if (!Array.isArray(items) || items.length === 0) {
    return Response.json({ error: "Please provide at least one item." }, { status: 400 });
  }
  if (items.length > 500) {
    return Response.json({ error: "Too many items. Please provide at most 500." }, { status: 400 });
  }
  if (items.some((i) => typeof i.name !== "string" || i.name.length > 200)) {
    return Response.json({ error: "Each item name must be 200 characters or fewer." }, { status: 400 });
  }

  const systemPrompt =
    category === "podcasts" ? PODCASTS_REPLACE_SYSTEM
    : category === "watch" ? WATCH_REPLACE_SYSTEM
    : category === "games" ? GAMES_REPLACE_SYSTEM
    : BOOKS_REPLACE_SYSTEM;

  const userMessage =
    category === "watch"
      ? buildWatchReplaceUserMessage(items, exclude, currentlyShown, format, mood, dismissReason, deepCuts)
      : category === "games"
        ? buildGamesReplaceUserMessage(items, exclude, currentlyShown, platform, dismissReason, deepCuts)
        : buildReplaceUserMessage(items, exclude, currentlyShown, category, dismissReason);

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 30_000);

  try {
    const message = await client.messages.create(
      {
        model: REPLACE_MODEL,
        max_tokens: 512,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: userMessage }],
      },
      { signal: abort.signal },
    );

    clearTimeout(timer);

    const raw = message.content[0].type === "text" ? message.content[0].text : "";

    let rec: Recommendation;
    try {
      rec = JSON.parse(raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()) as Recommendation;
    } catch {
      console.error("Failed to parse Claude replace response as JSON", { raw });
      return Response.json({ error: "Received an unexpected response from the AI. Please try again." }, { status: 502 });
    }

    if (!rec.title || !rec.author) {
      return Response.json({ error: "AI response was missing required fields. Please try again." }, { status: 502 });
    }

    rec.amazon_search = category === "podcasts"
      ? sanitizePodcastUrl(rec.amazon_search ?? "", rec.title)
      : category === "watch"
        ? ""
        : category === "games"
          ? sanitizeAmazonUrl(rec.amazon_search ?? "", rec.title, rec.platform?.split(" / ")[0] || "")
          : sanitizeAmazonUrl(rec.amazon_search ?? "", rec.title, rec.author);

    if (category === "watch") {
      rec.justwatch_search = sanitizeJustWatchUrl(rec.justwatch_search ?? "", rec.title);
    }

    return Response.json({ recommendation: rec });
  } catch (err: unknown) {
    clearTimeout(timer);
    console.error("Claude API replace error", err);
    return Response.json({ error: "Something went wrong reaching the AI. Please try again." }, { status: 502 });
  }
}
