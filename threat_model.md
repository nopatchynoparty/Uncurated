# Threat Model

## Project Overview

Uncurated is a stateless recommendation web app. A browser client sends a user's rated books to an Express API, and the API calls Anthropic Claude to generate a taste profile and recommendations. The deployed production surface is a small public web frontend plus `/api/*` routes in `artifacts/api-server`.

## Assets

- **Anthropic API key and paid model quota** -- compromise or abuse would let attackers spend the application's credits and disrupt service.
- **Service availability** -- recommendation generation depends on live upstream model calls; resource exhaustion or slow upstream calls can make the app unavailable.
- **User reading-history submissions** -- book titles and ratings reveal personal preferences and should not leak through logs or unnecessary responses.
- **Recommendation integrity** -- users trust the application to return benign recommendation content and outbound shopping links, not attacker-controlled destinations.

## Trust Boundaries

- **Browser to API** -- all user input crosses from an untrusted client into the Express server through public JSON endpoints.
- **API to Anthropic** -- the server sends user-controlled prompt content to Claude using a secret API key and must treat the upstream response as untrusted data until validated.
- **API to static frontend** -- the server serves non-API requests as frontend assets; production should expose only the intended application, not development artifacts.
- **Development-only artifacts to production** -- the workspace contains `artifacts/mockup-sandbox`, unused React template files, and `lib/db`; these should be ignored unless a real deployment path proves they are reachable in production.

## Scan Anchors

- Production backend entry points: `artifacts/api-server/src/index.ts`, `artifacts/api-server/src/app.ts`, `artifacts/api-server/src/routes/*.ts`
- Highest-risk production code: `artifacts/api-server/src/routes/recommendations.ts` (public LLM-backed POST routes)
- Public surface: `GET /api/healthz`, `POST /api/recommendations`, `POST /api/recommendations/replace`, static frontend assets
- Dev-only by default: `artifacts/mockup-sandbox/**`, stale template React UI files in `artifacts/taste-app/src/components/**`, `lib/db/**` unless imported into production runtime

## Threat Categories

### Tampering

User-controlled request bodies are interpolated into LLM prompts and then influence returned recommendation objects. The server must validate both inbound request shape and outbound model output structure so attackers cannot use malformed inputs or model deviations to smuggle unsafe content into the frontend or break application behavior.

### Information Disclosure

The application handles sensitive preference data in users' submitted reading lists and ratings. Error handling and logging must avoid exposing request contents, secrets, or verbose upstream failure details to clients or logs beyond what operations staff need.

### Denial of Service

The recommendation endpoints are public and each successful request triggers a paid upstream Claude call. Production must enforce abuse controls such as request throttling, bounded input sizes, and reasonable upstream timeouts so unauthenticated attackers cannot consume credits, saturate workers, or hold connections open indefinitely.

### Elevation of Privilege

There is no authenticated user/admin surface today, so classic role escalation is not a primary risk. The relevant privilege boundary is between anonymous internet callers and the application's server-side access to Anthropic using `CLAUDE_API_KEY`; public callers must not be able to convert that privileged integration into an unrestricted proxy for arbitrary spend or malicious outbound behavior.
