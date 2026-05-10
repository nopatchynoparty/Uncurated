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

function buildPrompt(items: RatedItem[], category: string): string {
  const itemLines = items
    .map((i) => `- "${i.name}" (${i.rating})`)
    .join("\n");

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
      model: "claude-opus-4-5",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildPrompt(items, category),
        },
      ],
    });

    const raw =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: RecommendationResponse;
    try {
      parsed = JSON.parse(raw);
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

export default router;
