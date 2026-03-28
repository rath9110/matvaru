import "dotenv/config";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { WillysApi } from "./willys-api.js";

const username = process.env.WILLYS_USERNAME?.replace(/^"|"$/g, "") ?? "";
const password = process.env.WILLYS_PASSWORD?.replace(/^"|"$/g, "") ?? "";
const hasCredentials = username !== "" && password !== "";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll getCart until a condition is met or retries are exhausted. */
async function waitForCart(
  api: WillysApi,
  predicate: (count: number) => boolean,
  retries = 5,
): Promise<number> {
  for (let i = 0; i < retries; i++) {
    const cart = await api.getCart();
    if (predicate(cart.totalUnitCount)) return cart.totalUnitCount;
    await sleep(1000);
  }
  const cart = await api.getCart();
  return cart.totalUnitCount;
}

describe.skipIf(!hasCredentials)("Willys API Integration", { timeout: 30_000 }, () => {
  const api = new WillysApi();

  beforeAll(async () => {
    await api.login(username, password);
    // Ensure we start with an empty cart
    await api.clearCart();
  });

  afterAll(async () => {
    try {
      await api.clearCart();
      await api.logout();
    } catch {
      // ignore cleanup errors
    }
  });

  it("should login and return a customer profile", async () => {
    const customer = await api.getCustomer();
    expect(customer.name).toBeTruthy();
    expect(customer.email).toBeTruthy();
    expect(customer.storeId).toBeDefined();
  });

  it("should search for products", async () => {
    const results = await api.search("mjölk", 0, 5);
    expect(results.pagination.totalNumberOfResults).toBeGreaterThan(0);
    expect(results.results.length).toBeGreaterThan(0);

    const product = results.results[0];
    expect(product.name).toBeTruthy();
    expect(product.code).toBeTruthy();
    expect(product.price).toBeDefined();
  });

  it("should get categories", async () => {
    const tree = await api.getCategories();
    expect(tree.title).toBeTruthy();
    expect(tree.children.length).toBeGreaterThan(0);
  });

  it("should browse a category", async () => {
    const results = await api.browseCategory("frukt-och-gront/frukt/citrusfrukt", 0, 5);
    expect(results.pagination.totalNumberOfResults).toBeGreaterThan(0);
    expect(results.results.length).toBeGreaterThan(0);
  });

  it("should add to and remove from cart", async () => {
    const searchResult = await api.search("mjölk", 0, 1);
    const product = searchResult.results[0];
    expect(product).toBeDefined();

    await api.addToCart([{ code: product.code, qty: 1 }]);
    const countAfterAdd = await waitForCart(api, (n) => n > 0);
    expect(countAfterAdd).toBeGreaterThan(0);

    await api.removeFromCart(product.code);
    const countAfterRemove = await waitForCart(api, (n) => n < countAfterAdd);
    expect(countAfterRemove).toBeLessThan(countAfterAdd);
  });

  it("should clear the cart", async () => {
    const searchResult = await api.search("mjölk", 0, 1);
    await api.addToCart([{ code: searchResult.results[0].code, qty: 1 }]);
    await waitForCart(api, (n) => n > 0);

    await api.clearCart();
    const count = await waitForCart(api, (n) => n === 0);
    expect(count).toBe(0);
  });
});
