# Implementation decisions

- The spec names `spec.md` in this workspace; it remains the source of truth.
- The local app defaults to `GEMINI_MOCK=true`, so a developer can explore cases without a key. The optional Gemini adapter screens seeds, validates a blueprint, generates chats, runs a blind-solve check using public evidence only, and generates image/CCTV frames. Image failures fall back to stylized placeholders whose captions retain clue information.
- Account sessions use one HTTP-only JWT cookie for both registered and guest users. The app supports registration and login, and the landing flow creates a guest only when there is no current session.
- Case state is stored in MongoDB. MongoDB is required to run the complete multi-user API, even when Gemini is mocked.
- Evidence assets use local disk storage and ownership-checked image delivery. Mock mode creates SVG scene placeholders; Gemini mode stores generated image bytes when available.
- Async job execution is an in-process runner. A process restart marks stale cases failed, as described in the spec.
- Optional reasoning, pinned evidence, and notes are device-local except that submitted reasoning/citations are saved on the attempt; notes and pins use per-case localStorage keys.
