#!/usr/bin/env node
import "dotenv/config";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { WillysApi } from "./willys-api.js";
import { SKILL_MD } from "./skill.js";
import type { Cart, Product } from "./types.js";

function formatProduct(p: Product): string {
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
    console.log("Cart is empty.");
    return;
  }
  console.log(`Cart (${cart.totalUnitCount} items):`);
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
  console.log(`Total: ${cart.totalPrice}`);
}

async function runOperation(
  api: WillysApi,
  op: string,
  args: string[],
): Promise<void> {
  switch (op) {
    case "cart": {
      const cart = await api.getCart();
      printCart(cart);
      break;
    }

    case "add": {
      const code = args[0];
      const qty = parseInt(args[1] ?? "1", 10);
      if (!code) throw new Error("add requires a product code");
      const cart = await api.addToCart([{ code, qty }]);
      console.log(`Added ${qty}x ${code}`);
      printCart(cart);
      break;
    }

    case "remove": {
      const code = args[0];
      if (!code) throw new Error("remove requires a product code");
      const cart = await api.removeFromCart(code);
      console.log(`Removed ${code}`);
      printCart(cart);
      break;
    }

    case "clear": {
      await api.clearCart();
      console.log("Cart cleared.");
      const cart = await api.getCart();
      printCart(cart);
      break;
    }

    case "search": {
      const query = args[0];
      const count = parseInt(args[1] ?? "10", 10);
      if (!query) throw new Error("search requires a query");

      const collected: Product[] = [];
      let page = 0;
      const pageSize = Math.min(count, 30);

      while (collected.length < count) {
        const results = await api.search(query, page, pageSize);
        collected.push(...results.results);
        if (page === 0) {
          console.log(`${results.pagination.totalNumberOfResults} results for "${query}":`);
        }
        if (page + 1 >= results.pagination.numberOfPages) break;
        page++;
      }

      for (const p of collected.slice(0, count)) {
        console.log(formatProduct(p));
      }
      break;
    }

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
      if (!catPath) throw new Error("browse requires a category path");
      const results = await api.browseCategory(catPath, page, 10);
      console.log(`${results.pagination.totalNumberOfResults} products:`);
      for (const p of results.results) {
        console.log(formatProduct(p));
      }
      break;
    }

    default:
      throw new Error(`Unknown operation: ${op}`);
  }
}

function usage(): never {
  console.error(`Usage:
  willys-cli [-u <username> -p <password>] <operation> [args...]
  willys-cli [-u <username> -p <password>] -i <file>

Credentials are read from -u/-p flags, or WILLYS_USERNAME/WILLYS_PASSWORD
environment variables (also loaded from .env).

Operations:
  cart                          Show cart contents
  add <product-code> [qty]      Add product to cart
  remove <product-code>         Remove product from cart
  clear                         Clear the cart
  search <query> [count]         Search for products (default: 10)
  categories                    List categories
  browse <category-path> [page] Browse a category

File format (CSV, one operation per line):
  add,<product-code>,<quantity>
  remove,<product-code>
  clear
  cart`);
  process.exit(1);
}

async function main() {
  const argv = process.argv.slice(2);
  let username = "";
  let password = "";
  let inputFile = "";
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "-u":
        username = argv[++i] ?? "";
        break;
      case "-p":
        password = argv[++i] ?? "";
        break;
      case "-i":
        inputFile = argv[++i] ?? "";
        break;
      case "--install-skills": {
        const dir = join(process.cwd(), ".claude", "skills", "willys-cli");
        mkdirSync(dir, { recursive: true });
        const dest = join(dir, "SKILL.md");
        writeFileSync(dest, SKILL_MD);
        console.log(`Installed willys-cli skill to ${dest}`);
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

  if (!username) username = process.env.WILLYS_USERNAME?.replace(/^"|"$/g, "") ?? "";
  if (!password) password = process.env.WILLYS_PASSWORD?.replace(/^"|"$/g, "") ?? "";

  if (!username || !password) {
    console.error("Error: No credentials provided. Use -u/-p flags or set WILLYS_USERNAME/WILLYS_PASSWORD.\n");
    usage();
  }
  if (!inputFile && positional.length === 0) usage();

  const api = new WillysApi();
  await api.login(username, password);

  if (inputFile) {
    const content = readFileSync(inputFile, "utf-8");
    const lines = content
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#"));

    for (const line of lines) {
      const [op, ...args] = line.split(",").map((s) => s.trim());
      console.log(`> ${op} ${args.join(" ")}`);
      await runOperation(api, op, args);
      console.log();
    }
  } else {
    const [op, ...args] = positional;
    await runOperation(api, op, args);
  }

  await api.logout();
}

main().catch((e) => {
  console.error(`Error: ${e.message}`);
  process.exit(1);
});
