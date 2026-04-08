import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { findCheapestBasket } from "./basket.js";
import {
  WillysProvider,
  IcaProvider,
  CoopProvider,
  LidlProvider,
} from "./providers/index.js";
import type { BasketItem } from "./types.js";

// ── Paths ──────────────────────────────────────────────────────────────────
// dist/server.js → __dirname = dist/ → dist/client/ for static assets
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = path.resolve(__dirname, "client");

// ── Config ─────────────────────────────────────────────────────────────────
const port = Number(process.env.PORT ?? 3000);
// Bind to localhost only by default — prevents exposure to other network clients.
// Set BIND_HOST=0.0.0.0 only when deploying behind a reverse proxy.
const hostname = process.env.BIND_HOST ?? "127.0.0.1";
const apiSecret = process.env.API_SECRET;
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "http://localhost:5173";

if (!apiSecret) {
  console.warn(
    "WARNING: API_SECRET is not set. The API is unprotected.\n" +
    "         Set API_SECRET=<random-string> in .env for any non-localhost deployment.",
  );
}

// ── Provider instances — stateful (session/cookies), created once ──────────
const willys = new WillysProvider();
const ica = new IcaProvider();
const coop = new CoopProvider();
const lidl = new LidlProvider();

async function initProviders(): Promise<void> {
  const username = process.env.WILLYS_USERNAME;
  const password = process.env.WILLYS_PASSWORD;
  if (username && password) {
    try {
      await willys.login({ username, password });
      console.log("Willys: logged in");
    } catch (e) {
      // Do not log credentials or the full error object — it may contain them
      console.warn("Willys login failed — Willys results may be unavailable");
    }
  } else {
    console.warn("WILLYS_USERNAME/WILLYS_PASSWORD not set — skipping Willys login");
  }
}

// ── Per-IP rate limiting ───────────────────────────────────────────────────
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 15;
const ipRequests = new Map<string, { count: number; resetAt: number }>();

// Periodically clean up stale entries so the map doesn't grow unbounded
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipRequests) {
    if (now > entry.resetAt) ipRequests.delete(ip);
  }
}, RATE_WINDOW_MS);

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipRequests.get(ip);
  if (!entry || now > entry.resetAt) {
    ipRequests.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_MAX_REQUESTS) return true;
  entry.count++;
  return false;
}

function clientIp(req: { header: (name: string) => string | undefined }): string {
  // Trust X-Forwarded-For only if behind a known reverse proxy (BIND_HOST overridden).
  // For localhost-only operation the remote address is always 127.0.0.1.
  if (process.env.BIND_HOST) {
    const forwarded = req.header("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();
  }
  return "127.0.0.1";
}

// ── App ────────────────────────────────────────────────────────────────────
const app = new Hono();

// CORS — only allow requests from the configured frontend origin.
// In production (same-origin), the Origin header won't be present and this is a no-op.
app.use(
  "/api/*",
  cors({
    origin: allowedOrigin,
    allowMethods: ["POST"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

// Auth + rate limiting for all API routes
app.use("/api/*", async (c, next) => {
  // Rate limit
  const ip = clientIp(c.req);
  if (isRateLimited(ip)) {
    return c.json({ error: "Too many requests" }, 429);
  }

  // Bearer token auth — enforced only when API_SECRET is set
  if (apiSecret) {
    const auth = c.req.header("Authorization");
    if (auth !== `Bearer ${apiSecret}`) {
      return c.json({ error: "Unauthorized" }, 401);
    }
  }

  await next();
});

// POST /api/compare
app.post("/api/compare", async (c) => {
  let body: { items?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return c.json({ error: "items must be a non-empty array" }, 400);
  }

  if (body.items.length > 30) {
    return c.json({ error: "Maximum 30 items per request" }, 400);
  }

  const items: BasketItem[] = [];
  for (const raw of body.items) {
    if (
      typeof raw !== "object" ||
      raw === null ||
      typeof (raw as Record<string, unknown>).query !== "string" ||
      ((raw as Record<string, unknown>).query as string).trim() === ""
    ) {
      return c.json({ error: "Each item must have a non-empty query string" }, 400);
    }
    const qty = (raw as Record<string, unknown>).quantity;
    if (typeof qty !== "number" || !Number.isInteger(qty) || qty < 1) {
      return c.json({ error: "Each item must have quantity as an integer >= 1" }, 400);
    }
    items.push({
      query: ((raw as Record<string, unknown>).query as string).trim(),
      quantity: qty,
    });
  }

  try {
    const result = await findCheapestBasket(items, [willys, ica, coop, lidl], {
      candidatesPerQuery: 5,
    });
    return c.json(result);
  } catch (e) {
    // Log the real error server-side only — never forward internal details to the client
    console.error("findCheapestBasket error:", e);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Serve index.html with API secret injected so the client can authenticate.
// The secret is only reachable by whoever can load the page — i.e. localhost.
app.get("/", async (c) => {
  try {
    const html = await readFile(path.join(CLIENT_DIR, "index.html"), "utf-8");
    const injection = apiSecret
      ? `<script>window.__API_SECRET__=${JSON.stringify(apiSecret)};</script>`
      : "";
    return c.html(html.replace("</head>", `${injection}</head>`));
  } catch {
    return c.notFound();
  }
});

// Serve remaining static assets (JS, CSS, fonts, etc.)
app.use("/*", serveStatic({ root: CLIENT_DIR }));

// ── Start ──────────────────────────────────────────────────────────────────
await initProviders();

serve({ fetch: app.fetch, port, hostname }, () => {
  console.log(`Server running at http://${hostname}:${port}`);
});
