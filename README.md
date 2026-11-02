# AI Mystery Room

A noir-styled, responsive mystery investigation game. Create a fictional story seed, examine chats, photographs, and CCTV sequences, then make one final accusation. The server keeps the culprit and solution out of pre-accusation case and evidence responses.

## Requirements

- Node.js 20+
- MongoDB (local or hosted)
- npm 10+

## Run locally

1. Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`.
2. Ensure MongoDB is running. The default URI is `mongodb://localhost:27017/ai-mystery-room`.
3. Keep `GEMINI_MOCK=true` to run without an API key. Set it to `false` and fill in `GEMINI_API_KEY`, `GEMINI_TEXT_MODEL`, and `GEMINI_IMAGE_MODEL` to enable Gemini seed screening, blueprint and chat generation, blind-solve checks, and evidence image generation. Failed image generation falls back to a clue-bearing placeholder.
4. From the repository root run `npm install`, then `npm run dev`.
5. Open `http://localhost:5173`. The API health endpoint is `http://localhost:5000/api/health`.

The mock mode works offline from Gemini and returns complete fictional case fixtures with placeholder evidence art. MongoDB remains required for accounts, case ownership, and persisted investigations. Copying the server environment file is required because the API fails fast when `JWT_SECRET` is missing or shorter than 32 characters.

## Case API

The investigation UI uses these authenticated endpoints:

- `POST /api/cases` creates a case and starts generation.
- `GET /api/cases/:id` returns the active case and clues discovered so far.
- `POST /api/cases/:id/clues/:clueId/discover` records a clue found in evidence. Include `{ "evidenceId": "ev_01" }` in the JSON body; the clue must be linked to that evidence.
- `POST /api/cases/:id/hints` requests the next available hint.
- `POST /api/cases/:id/accuse` submits the final suspect and reasoning.
- `GET /api/cases/:id/result` returns the completed result after an accusation. `/reveal` remains available for older links.

## Commands

- `npm run dev` — run client and API in watch mode.
- `npm run build` — build shared package, API, and client.
- `npm run typecheck` — type-check all workspaces.
- `npm test` — run workspace test commands.

## Environment

See `server/.env.example` and `client/.env.example`. `GEMINI_TEXT_MODEL` and `GEMINI_IMAGE_MODEL` are environment-controlled; the API key stays on the server. `CLIENT_ORIGIN` must match the client origin. The session cookie is HTTP-only, SameSite=Lax, Secure in production, and expires in seven days.

## Project structure

- `shared/` — shared Zod contracts and difficulty counts.
- `server/` — Express API, Mongoose persistence, auth, async mock/Gemini pipeline, scoring, hints, and reveal.
- `client/` — React/Vite app, accessible evidence viewers, case archive, accusation flow, and responsive noir styling.
- `storage/` — reserved for generated media (ignored locally).
