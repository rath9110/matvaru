# willys-cli

[![CI](https://github.com/ErikHellman/willys-agent/actions/workflows/ci.yml/badge.svg)](https://github.com/ErikHellman/willys-agent/actions/workflows/ci.yml)

TypeScript library and CLI for the [Willys](https://www.willys.se/) grocery store API.

Search for products, browse categories, and manage your shopping cart from the terminal.

## Install

```bash
npm install -g willys-cli
```

This installs the `willys-cli` command globally. Requires Node.js 18+ (for native `fetch` support).

## Credentials

The CLI requires your Willys account credentials (personnummer + password). Provide them in one of two ways:

**Environment variables** (or a `.env` file in the working directory):

```
WILLYS_USERNAME=199001011234
WILLYS_PASSWORD=yourpassword
```

**CLI flags:**

```bash
willys-cli -u 199001011234 -p yourpassword <operation>
```

Flags take precedence over environment variables. Quoted values in `.env` are stripped automatically.

## CLI Usage

### Searching for products

```bash
# Search for products (default 10 results)
willys-cli search mjölk

# Search with more results (auto-paginates)
willys-cli search "ekologisk mjölk" 30
```

### Browsing categories

```bash
# List all categories (up to 3 levels deep)
willys-cli categories

# Browse products in a specific category
willys-cli browse frukt-och-gront/frukt/citrusfrukt

# Browse with pagination (page number, 0-indexed)
willys-cli browse frukt-och-gront/frukt/citrusfrukt 2
```

### Managing your cart

```bash
# View cart contents
willys-cli cart

# Add a product (by product code, with optional quantity)
willys-cli add 101233933_ST 2

# Remove a product
willys-cli remove 101233933_ST

# Clear the entire cart
willys-cli clear
```

### Batch operations

Create a CSV file with one operation per line (lines starting with `#` are ignored):

```csv
# Weekly shopping list
add,101233933_ST,2
add,101205823_ST,1
cart
remove,101205823_ST
clear
```

Run it:

```bash
willys-cli -i shopping-list.csv
```

### Help

```bash
willys-cli -h
willys-cli --help
```

## Library Usage

The package also exports a programmatic API:

```typescript
import { WillysApi } from "willys-cli";

const api = new WillysApi();
await api.login("199001011234", "yourpassword");

// Search products
const results = await api.search("mjölk");
console.log(results.results[0].name);

// Manage cart
await api.addToCart([{ code: "101233933_ST", qty: 2 }]);
const cart = await api.getCart();
console.log(cart.totalPrice);

await api.logout();
```

### API Methods

| Method | Description |
|--------|-------------|
| `login(username, password)` | Authenticate and start a session (returns `Customer`) |
| `logout()` | End the session |
| `getCustomer()` | Get current user profile |
| `search(query, page?, size?)` | Search products (default page 0, size 30) |
| `getCategories(storeId?)` | Get the full category tree |
| `browseCategory(path, page?, size?)` | List products in a category |
| `getCart()` | Get current cart contents |
| `addToCart([{code, qty}])` | Add one or more products to cart |
| `removeFromCart(code)` | Remove a product from cart |
| `clearCart()` | Empty the cart |

### Exported Types

All response types are available as named exports:

```typescript
import type { Customer, Product, SearchResult, Cart, Category } from "willys-cli";
```

## Claude Code Integration

Install the bundled Claude Code skill into your project:

```bash
cd your-project
willys-cli --install-skills
```

This creates `.claude/skills/willys-cli/SKILL.md`, enabling Claude Code to use the Willys CLI as a tool within your project.

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Getting started

```bash
git clone https://github.com/ErikHellman/willys-agent.git
cd willys-agent
npm install
```

Create a `.env` file with your Willys credentials:

```
WILLYS_USERNAME=199001011234
WILLYS_PASSWORD=yourpassword
```

### Build & run

```bash
npm run build     # Compile TypeScript → dist/
npm start         # Run CLI in dev mode (via tsx, no build needed)
npm test          # Run integration tests (hits the live API)
```

### Project structure

| File | Purpose |
|------|---------|
| `src/willys-api.ts` | HTTP client with cookie/CSRF session management |
| `src/crypto.ts` | AES-128-CBC credential encryption |
| `src/types.ts` | TypeScript interfaces for all API responses |
| `src/cli.ts` | CLI entrypoint with argument parsing |
| `src/skill.ts` | Embedded Claude Code SKILL.md content |
| `src/index.ts` | Library exports |
| `src/test.ts` | Integration tests (requires credentials) |

## Creating a Release

1. **Bump the version** in `package.json`:

   ```bash
   npm version patch   # or minor / major
   ```

   This updates `package.json` and creates a git tag (e.g., `v1.0.1`).

2. **Push the commit and tag:**

   ```bash
   git push origin main --tags
   ```

3. **Publish to npm:**

   ```bash
   npm publish
   ```

   The `prepublishOnly` script runs `npm run build` automatically before publishing.

4. **Create a GitHub release** (optional but recommended):

   ```bash
   gh release create v1.0.1 --generate-notes
   ```

## License

[MIT](LICENSE.md) - Erik Hellman
