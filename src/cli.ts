#!/usr/bin/env node
import "dotenv/config";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SKILL_MD } from "./skill.js";
import { WillysApi } from "./willys-api.js";
import { WillysProvider, IcaProvider, CoopProvider, LidlProvider } from "./providers/index.js";
import type { StoreProvider } from "./providers/index.js";
import { findCheapestBasket } from "./basket.js";
import type { BasketItem, BasketResult, MatchedItem, NormalizedProduct } from "./types.js";
import type { Cart, Product } from "./types.js";
import type { StoreName } from "./types.js";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toFixed(2).replace(".", ",") + " kr";
}

function fmtProduct(p: NormalizedProduct): string {
  const parts = [p.name];
  if (p.brand) parts.push(`[${p.brand}]`);
  if (p.volume) parts.push(p.volume);
  parts.push(`— ${fmt(p.price)}`);
  if (p.comparePrice && p.comparePriceUnit) {
    parts.push(`(${fmt(p.comparePrice)}/${p.comparePriceUnit})`);
  }
  if (p.promotions.length > 0) {
    const promo = p.promotions[0];
    const priceStr = promo.discountedPrice !== null ? ` ${fmt(promo.discountedPrice)}` : "";
    parts.push(`🏷 ${promo.description}${priceStr}`);
  }
  parts.push(`(${p.id})`);
  return `  ${parts.join(" ")}`;
}

function fmtBasketResult(result: BasketResult, index: number): void {
  const medal = index === 0 ? "★" : " ";
  const savings = result.savingsVsWorst > 0 ? ` (sparar ${fmt(result.savingsVsWorst)})` : "";
  console.log(`\n${medal} ${result.store.toUpperCase()}  ${fmt(result.totalPrice)}${savings}`);

  for (const item of result.matched) {
    const saleTag = item.effectivePrice < item.product.price
      ? ` → REA ${fmt(item.effectivePrice)}`
      : "";
    console.log(
      `    ${item.quantity}x ${item.product.name}` +
      (item.product.brand ? ` [${item.product.brand}]` : "") +
      (item.product.volume ? ` ${item.product.volume}` : "") +
      `  ${fmt(item.product.price)}${saleTag}` +
      `  = ${fmt(item.lineTotal)}`,
    );
  }
  if (result.unmatched.length > 0) {
    console.log(`    ✗ Saknas: ${result.unmatched.map((u) => u.query).join(", ")}`);
  }
}

// ─── Credential / provider helpers ───────────────────────────────────────────

function env(key: string): string {
  return process.env[key]?.replace(/^"|"$/g, "") ?? "";
}

const ALL_STORE_NAMES: StoreName[] = ["willys", "ica", "coop", "lidl"];

async function buildProviders(storeNames: StoreName[]): Promise<StoreProvider[]> {
  const providers: StoreProvider[] = [];

  for (const name of storeNames) {
    switch (name) {
      case "willys": {
        const username = env("WILLYS_USERNAME");
        const password = env("WILLYS_PASSWORD");
        if (!username || !password) {
          console.error("Varning: WILLYS_USERNAME/WILLYS_PASSWORD saknas — Willys hoppas över.");
          continue;
        }
        const p = new WillysProvider();
        await p.login({ username, password });
        providers.push(p);
        break;
      }
      case "ica":
        providers.push(new IcaProvider());
        break;
      case "coop":
        providers.push(new CoopProvider());
        break;
      case "lidl":
        providers.push(new LidlProvider());
        break;
    }
  }

  return providers;
}

function parseStoreList(raw: string): StoreName[] {
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is StoreName => ALL_STORE_NAMES.includes(s as StoreName));
}

// ─── Shopping list parser ─────────────────────────────────────────────────────

/**
 * Parse items from a comma-separated inline string: "mjölk 3%:2, pasta:1"
 * Each token is "query:qty" or just "query" (defaults to qty 1).
 */
function parseInlineList(raw: string): BasketItem[] {
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const colon = token.lastIndexOf(":");
      if (colon > 0 && /^\d+$/.test(token.slice(colon + 1).trim())) {
        return {
          query: token.slice(0, colon).trim(),
          quantity: parseInt(token.slice(colon + 1).trim(), 10),
        };
      }
      return { query: token, quantity: 1 };
    });
}

/**
 * Parse a shopping list file. One item per line, format: "query:qty" or "query".
 * Lines starting with # are comments.
 */
function parseListFile(path: string): BasketItem[] {
  const lines = readFileSync(path, "utf-8")
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"));
  return parseInlineList(lines.join(","));
}

// ─── Willys-specific cart commands (legacy) ───────────────────────────────────

function fmtWillysProduct(p: Product): string {
  const parts = [p.name];
  if (p.manufacturer) parts.push(`[${p.manufacturer}]`);
  if (p.displayVolume) parts.push(p.displayVolume);
  parts.push(`— ${p.price}`);
  if (p.comparePrice && p.comparePriceUnit) {
    parts.push(`(${p.comparePrice}/${p.comparePriceUnit})`);
  }
  parts.push(`(${p.code})`);
  return `  ${parts.join(" ")}`;
}

function printCart(cart: Cart): void {
  if (cart.totalUnitCount === 0) {
    console.log("Varukorgen är tom.");
    return;
  }
  console.log(`Varukorg (${cart.totalUnitCount} artiklar):`);
  for (const p of cart.products) {
    const parts = [`  ${p.name}`];
    if (p.manufacturer) parts.push(`[${p.manufacturer}]`);
    if (p.displayVolume) parts.push(p.displayVolume);
    parts.push(`x${p.pickQuantity} — ${p.totalPrice}`);
    if (p.comparePrice && p.comparePriceUnit) {
      parts.push(`(${p.comparePrice}/${p.comparePriceUnit})`);
    }
    parts.push(`(${p.code})`);
    console.log(parts.join(" "));
  }
  console.log(`Totalt: ${cart.totalPrice}`);
}

async function runWillysOp(api: WillysApi, op: string, args: string[]): Promise<void> {
  switch (op) {
    case "cart":
      printCart(await api.getCart());
      break;

    case "add": {
      const code = args[0];
      const qty = parseInt(args[1] ?? "1", 10);
      if (!code) throw new Error("add kräver en produktkod");
      const cart = await api.addToCart([{ code, qty }]);
      console.log(`La till ${qty}x ${code}`);
      printCart(cart);
      break;
    }

    case "remove": {
      const code = args[0];
      if (!code) throw new Error("remove kräver en produktkod");
      const cart = await api.removeFromCart(code);
      console.log(`Tog bort ${code}`);
      printCart(cart);
      break;
    }

    case "clear":
      await api.clearCart();
      console.log("Varukorgen tömd.");
      printCart(await api.getCart());
      break;

    case "categories": {
      const tree = await api.getCategories();
      function print(cat: typeof tree, depth: number): void {
        if (depth > 2) return;
        console.log(`${"  ".repeat(depth)}${cat.title} (${cat.url})`);
        for (const child of cat.children) print(child, depth + 1);
      }
      print(tree, 0);
      break;
    }

    case "browse": {
      const catPath = args[0];
      const page = parseInt(args[1] ?? "0", 10);
      if (!catPath) throw new Error("browse kräver en kategorisökväg");
      const results = await api.browseCategory(catPath, page, 10);
      console.log(`${results.pagination.totalNumberOfResults} produkter:`);
      for (const p of results.results) console.log(fmtWillysProduct(p));
      break;
    }

    default:
      throw new Error(`Okänd åtgärd: ${op}`);
  }
}

// ─── Multi-store commands ─────────────────────────────────────────────────────

async function cmdSearch(
  query: string,
  storeNames: StoreName[],
  count: number,
): Promise<void> {
  const providers = await buildProviders(storeNames);
  if (providers.length === 0) {
    console.error("Inga butiker tillgängliga.");
    return;
  }

  const results = await Promise.allSettled(
    providers.map((p) => p.search(query, 0, count)),
  );

  for (let i = 0; i < providers.length; i++) {
    const result = results[i];
    console.log(`\n── ${providers[i].name.toUpperCase()} ──`);
    if (result.status === "rejected") {
      console.error(`  Fel: ${result.reason}`);
      continue;
    }
    console.log(`${result.value.totalResults} träffar för "${query}":`);
    for (const p of result.value.products.slice(0, count)) {
      console.log(fmtProduct(p));
    }
  }
}

async function cmdBasket(items: BasketItem[], storeNames: StoreName[]): Promise<void> {
  if (items.length === 0) {
    console.error("Inköpslistan är tom.");
    return;
  }

  console.log(`\nJämför ${items.length} artiklar hos ${storeNames.join(", ")}...\n`);
  console.log("Artiklar:");
  for (const item of items) console.log(`  ${item.quantity}x ${item.query}`);

  const providers = await buildProviders(storeNames);
  if (providers.length === 0) {
    console.error("Inga butiker tillgängliga.");
    return;
  }

  const comparison = await findCheapestBasket(items, providers, { candidatesPerQuery: 5 });

  console.log("\n═══ Resultat per butik ═══");
  comparison.allStores.forEach((result, i) => fmtBasketResult(result, i));

  if (comparison.bestSingleStore) {
    console.log(
      `\n✓ Billigaste kompletta inköp: ${comparison.bestSingleStore.store.toUpperCase()} — ${fmt(comparison.bestSingleStore.totalPrice)}`,
    );
  } else {
    console.log("\n✗ Ingen butik kan leverera hela inköpslistan.");
  }

  if (comparison.perItemBest.length > 0) {
    console.log(`\n─ Teoretiskt lägsta pris (en artikel per butik): ${fmt(comparison.perItemBestTotal)}`);
    for (const item of comparison.perItemBest) {
      console.log(
        `  ${item.quantity}x ${item.product.name} @ ${item.product.store.toUpperCase()} — ${fmt(item.effectivePrice)} = ${fmt(item.lineTotal)}`,
      );
    }
  }
}

async function cmdDeals(storeNames: StoreName[]): Promise<void> {
  const providers = await buildProviders(storeNames);
  const withPromos = providers.filter((p) => typeof p.getPromotions === "function");

  if (withPromos.length === 0) {
    console.log("Inga butiker med kampanjdata tillgängliga.");
    return;
  }

  const results = await Promise.allSettled(withPromos.map((p) => p.getPromotions!()));

  for (let i = 0; i < withPromos.length; i++) {
    const result = results[i];
    console.log(`\n── ${withPromos[i].name.toUpperCase()} VECKANS ERBJUDANDEN ──`);
    if (result.status === "rejected") {
      console.error(`  Fel: ${result.reason}`);
      continue;
    }
    for (const p of result.value.slice(0, 20)) {
      console.log(fmtProduct(p));
    }
  }
}

// ─── Argument parsing & main ──────────────────────────────────────────────────

function usage(): never {
  console.error(`Användning:
  matvaru search <sökord> [--stores butik1,butik2] [--count N]
  matvaru basket "<artikel:antal, ...>" [--stores butik1,butik2]
  matvaru basket --file <fil> [--stores butik1,butik2]
  matvaru deals [--stores butik1,butik2]

  Willys-specifika kommandon (kräver WILLYS_USERNAME/WILLYS_PASSWORD):
  matvaru cart
  matvaru add <produktkod> [antal]
  matvaru remove <produktkod>
  matvaru clear
  matvaru categories
  matvaru browse <kategorisökväg> [sida]

Butiker: ${ALL_STORE_NAMES.join(", ")} (standard: alla)

Miljövariabler:
  WILLYS_USERNAME, WILLYS_PASSWORD   Willys-inloggning
  ICA_STORE_ID                       ICA-butik (standard: 1300)
  COOP_STORE_ID                      Coop-butik (standard: 5080)`);
  process.exit(1);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.length === 0) usage();

  // Parse flags
  let storeNames: StoreName[] = [...ALL_STORE_NAMES];
  let count = 10;
  let inputFile = "";
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--stores":
        storeNames = parseStoreList(argv[++i] ?? "");
        break;
      case "--count":
        count = parseInt(argv[++i] ?? "10", 10);
        break;
      case "--file":
        inputFile = argv[++i] ?? "";
        break;
      case "--install-skills": {
        const dir = join(process.cwd(), ".claude", "skills", "matvaru");
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, "SKILL.md"), SKILL_MD);
        console.log(`Installerade skill till ${join(dir, "SKILL.md")}`);
        process.exit(0);
      }
      case "-h":
      case "--help":
        usage();
        break;
      default:
        positional.push(argv[i]);
    }
  }

  const command = positional[0];
  const rest = positional.slice(1);

  switch (command) {
    case "search": {
      const query = rest[0];
      if (!query) {
        console.error("search kräver ett sökord");
        usage();
      }
      await cmdSearch(query, storeNames, count);
      break;
    }

    case "basket": {
      let items: BasketItem[];
      if (inputFile) {
        items = parseListFile(inputFile);
      } else if (rest[0]) {
        items = parseInlineList(rest[0]);
      } else {
        console.error("basket kräver en inköpslista eller --file");
        usage();
      }
      await cmdBasket(items, storeNames);
      break;
    }

    case "deals":
      await cmdDeals(storeNames);
      break;

    // ── Willys-specific cart commands ──────────────────────────────────────
    case "cart":
    case "add":
    case "remove":
    case "clear":
    case "categories":
    case "browse": {
      const username = env("WILLYS_USERNAME");
      const password = env("WILLYS_PASSWORD");
      if (!username || !password) {
        console.error("Fel: WILLYS_USERNAME/WILLYS_PASSWORD krävs för detta kommando.");
        process.exit(1);
      }
      const api = new WillysApi();
      await api.login(username, password);
      try {
        await runWillysOp(api, command, rest);
      } finally {
        await api.logout();
      }
      break;
    }

    default:
      console.error(`Okänt kommando: ${command}`);
      usage();
  }
}

main().catch((e) => {
  console.error(`Fel: ${e.message}`);
  process.exit(1);
});
