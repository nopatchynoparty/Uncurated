# Uncurated

An honest, agenda-free recommendation engine powered by Claude. No algorithms, no sponsors — just recommendations based on your actual taste.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/taste-app run dev` — run the frontend (port 25961)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- Required env: `CLAUDE_API_KEY` — Anthropic API key

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (`artifacts/api-server`)
- Frontend: Vite + vanilla TypeScript/HTML/CSS (`artifacts/taste-app`)
- AI: Anthropic Claude (`claude-sonnet-4-20250514`) via `@anthropic-ai/sdk`
- No database needed — stateless per-request

## Where things live

- `artifacts/api-server/src/routes/recommendations.ts` — Claude API call, prompt, JSON parsing
- `artifacts/taste-app/index.html` — full app HTML with `<template>` elements
- `artifacts/taste-app/src/app.ts` — all vanilla JS app logic
- `artifacts/taste-app/src/styles.css` — CSS with dark/light mode via `prefers-color-scheme`

## Architecture decisions

- Frontend is vanilla TypeScript compiled by Vite (no React) — keeps bundle tiny and matches the user's explicit preference
- API server serves `/api/*`; Vite dev server serves `/` — proxy routes them correctly in dev and prod
- Claude prompt forces JSON-only output with explicit shape; the route validates the parsed result before returning it
- No DB or session storage — recommendations are ephemeral per request
- `CLAUDE_API_KEY` is stored as a Replit secret, never in code

## Product

Users select Books (Podcasts/TV/Music coming soon), add titles they've read, rate each one (Loved/Liked/Meh/DNF), then request recommendations. Claude returns a taste profile paragraph and 5 personalized book picks with match scores, explanations, vibe tags, and Amazon search links.

## User preferences

- Vanilla HTML/CSS/JS frontend (no React)
- Dark/light mode via system preference, no toggle needed
- Claude model: `claude-sonnet-4-5`
- Amazon affiliate search links (no hardcoded affiliate tags)

## Gotchas

- The API server has `@workspace/db` in dependencies but does NOT import it — no `DATABASE_URL` needed
- Claude prompt must force JSON-only output — any markdown/text wrapping breaks the JSON.parse()
- `__dirname` in `app.ts` uses `fileURLToPath(import.meta.url)` because the server is ESM
