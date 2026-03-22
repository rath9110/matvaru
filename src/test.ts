import "dotenv/config";
import { WillysApi } from "./willys-api.js";

const api = new WillysApi();

async function main() {
  const username = process.env.WILLYS_USERNAME?.replace(/^"|"$/g, "") ?? "";
  const password = process.env.WILLYS_PASSWORD?.replace(/^"|"$/g, "") ?? "";

  if (!username || !password) {
    console.error("Missing WILLYS_USERNAME or WILLYS_PASSWORD in .env");
    process.exit(1);
  }

  // Test 1: Login
  console.log("=== Test: Login ===");
  try {
    const customer = await api.login(username, password);
    console.log(`Logged in as: ${customer.name} (${customer.email})`);
    console.log(`Store: ${customer.storeId}`);
  } catch (e) {
    console.error("Login failed:", e);
    process.exit(1);
  }

  // Test 2: Search
  console.log("\n=== Test: Search for 'mjölk' ===");
  try {
    const results = await api.search("mjölk", 0, 5);
    console.log(`Found ${results.pagination.totalNumberOfResults} results`);
    for (const p of results.results) {
      console.log(`  - ${p.name} (${p.code}) - ${p.price}`);
    }
  } catch (e) {
    console.error("Search failed:", e);
  }

  // Test 3: Categories
  console.log("\n=== Test: Get categories ===");
  try {
    const tree = await api.getCategories();
    console.log(`Root: ${tree.title}`);
    for (const child of tree.children.slice(0, 5)) {
      console.log(`  - ${child.title} (${child.url})`);
    }
  } catch (e) {
    console.error("Categories failed:", e);
  }

  // Test 4: Browse category
  console.log("\n=== Test: Browse 'frukt-och-gront/frukt/citrusfrukt' ===");
  try {
    const results = await api.browseCategory(
      "frukt-och-gront/frukt/citrusfrukt",
      0,
      5,
    );
    console.log(`Found ${results.pagination.totalNumberOfResults} products`);
    for (const p of results.results) {
      console.log(`  - ${p.name} (${p.code}) - ${p.price}`);
    }
  } catch (e) {
    console.error("Browse category failed:", e);
  }

  // Test 5: Cart operations
  console.log("\n=== Test: Cart operations ===");
  try {
    // Get initial cart
    let cart = await api.getCart();
    console.log(`Cart has ${cart.totalUnitCount} items`);

    // Search for a product to add
    const searchResult = await api.search("mjölk", 0, 1);
    const product = searchResult.results[0];
    if (product) {
      console.log(`Adding to cart: ${product.name} (${product.code})`);
      cart = await api.addToCart([{ code: product.code, qty: 1 }]);
      console.log(`Cart now has ${cart.totalUnitCount} items, total: ${cart.totalPrice}`);

      // Remove it
      console.log(`Removing ${product.code} from cart...`);
      cart = await api.removeFromCart(product.code);
      console.log(`Cart now has ${cart.totalUnitCount} items`);
    }
  } catch (e) {
    console.error("Cart operations failed:", e);
  }

  // Test 6: Logout
  console.log("\n=== Test: Logout ===");
  try {
    await api.logout();
    const customer = await api.getCustomer();
    console.log(`After logout, customer: ${customer.name}`);
  } catch (e) {
    console.error("Logout failed:", e);
  }

  console.log("\nAll tests complete!");
}

main().catch(console.error);
