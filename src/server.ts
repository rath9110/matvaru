import "dotenv/config";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { findCheapestBasket } from "./basket.js";
import {
  WillysProvider,
  IcaProvider,
  CoopProvider,
  LidlProvider,
} from "./providers/index.js";
import type { BasketItem } from "./types.js";

const app = new Hono();

// Provider instances — stateful (cookies/session), created once
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
      console.warn("Willys login failed — Willys results may be unavailable:", e);
    }
  } else {
    console.warn("WILLYS_USERNAME/WILLYS_PASSWORD not set — skipping Willys login");
  }
}

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
    const message = e instanceof Error ? e.message : String(e);
    console.error("findCheapestBasket error:", e);
    return c.json({ error: message }, 500);
  }
});

// Serve built frontend in production
app.use("/*", serveStatic({ root: "./dist/client" }));

const port = Number(process.env.PORT ?? 3000);

await initProviders();

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running at http://localhost:${port}`);
});
