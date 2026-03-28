# willys-cli

TypeScript library + CLI for the Willys.se grocery store API.

## Stack

- TypeScript, Node.js (ESM)
- No frameworks, no external HTTP libraries — uses native `fetch`
- `dotenv` for credential loading

## Project Structure

- `src/willys-api.ts` — HTTP client with cookie/CSRF session management. All API methods live here.
- `src/crypto.ts` — AES-128-CBC credential encryption (replicates Willys client-side encryption)
- `src/types.ts` — TypeScript interfaces for all API responses
- `src/cli.ts` — CLI entrypoint with arg parsing and output formatting
- `src/skill.ts` — Embedded Claude Code SKILL.md content
- `src/index.ts` — Library exports
- `src/test.ts` — Integration test (hits live API, requires credentials)

## Build & Test

```
npm run build     # tsc → dist/
npm test          # runs src/test.ts against live API
npm start         # runs CLI via tsx (dev mode)
```

## Credentials

Tests and CLI require `WILLYS_USERNAME` and `WILLYS_PASSWORD` in `.env` (quoted values are stripped automatically).
