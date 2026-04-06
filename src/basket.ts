import type { StoreProvider } from "./providers/store-provider.js";
import { pricePerUnit } from "./volume.js";
import type {
  BasketItem,
  BasketResult,
  MatchedItem,
  UnmatchedItem,
  NormalizedProduct,
  StoreName,
} from "./types.js";

export interface BasketOptions {
  /**
   * How many search results to consider per query per store when picking the
   * best candidate. Higher values are more thorough but slower.
   * Default: 5
   */
  candidatesPerQuery?: number;
}

export interface BasketComparison {
  /** All stores sorted cheapest first, based on complete-basket price. */
  allStores: BasketResult[];
  /**
   * Cheapest store that can fulfill every item in the basket.
   * Undefined if no store has all items in stock.
   */
  bestSingleStore: BasketResult | undefined;
  /**
   * The theoretical cheapest basket, picking the best product for each query
   * across all stores regardless of which store it comes from.
   */
  perItemBest: MatchedItem[];
  /** Sum of perItemBest line totals. */
  perItemBestTotal: number;
}

/**
 * Returns the lowest effective price for a product, considering active
 * promotions. Falls back to the regular price if no usable discount exists.
 */
function effectivePrice(product: NormalizedProduct): number {
  let best = product.price;
  for (const promo of product.promotions) {
    if (promo.discountedPrice !== null && promo.discountedPrice < best) {
      best = promo.discountedPrice;
    }
  }
  return best;
}

/**
 * Compute the best available price-per-canonical-unit for a product.
 *
 * Priority order:
 *   1. Derived from effective price ÷ parsed volume string  (most accurate)
 *   2. Store-supplied comparePrice (already per-unit but may use varying units)
 *   3. Effective pack price (last resort — no unit normalisation)
 */
function bestPerUnit(product: NormalizedProduct): number {
  const eff = effectivePrice(product);

  const derived = pricePerUnit(eff, product.volume);
  if (derived) return derived.value;

  if (product.comparePrice > 0) return product.comparePrice;

  return eff;
}

/**
 * From a list of candidate products, pick the one that offers the best value
 * for the given query. Selection criteria, in order:
 *   1. Must be in stock.
 *   2. Prefer lowest price-per-canonical-unit (kr/l, kr/kg, or kr/st) so that
 *      pack-size differences don't skew the comparison (e.g. 1.5 l vs 1 l milk).
 *   3. Fall back to lowest effective pack price when unit normalization fails.
 */
function pickBestCandidate(
  candidates: NormalizedProduct[],
): NormalizedProduct | undefined {
  const inStock = candidates.filter((p) => p.inStock);
  if (inStock.length === 0) return undefined;

  return inStock.reduce((best, current) => {
    const bestPPU = bestPerUnit(best);
    const currPPU = bestPerUnit(current);
    return currPPU < bestPPU ? current : best;
  });
}

/**
 * Search a single store for all basket items, returning matched and unmatched
 * items. Searches are fired in parallel.
 */
async function resolveStoreBasket(
  provider: StoreProvider,
  items: BasketItem[],
  candidatesPerQuery: number,
): Promise<{ matched: MatchedItem[]; unmatched: UnmatchedItem[] }> {
  const results = await Promise.allSettled(
    items.map((item) => provider.search(item.query, 0, candidatesPerQuery)),
  );

  const matched: MatchedItem[] = [];
  const unmatched: UnmatchedItem[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const result = results[i];

    if (result.status === "rejected") {
      unmatched.push({ query: item.query, quantity: item.quantity });
      continue;
    }

    const best = pickBestCandidate(result.value.products);
    if (!best) {
      unmatched.push({ query: item.query, quantity: item.quantity });
      continue;
    }

    const eff = effectivePrice(best);
    matched.push({
      query: item.query,
      product: best,
      quantity: item.quantity,
      effectivePrice: eff,
      lineTotal: eff * item.quantity,
    });
  }

  return { matched, unmatched };
}

/**
 * Compare prices for a basket of items across multiple stores.
 *
 * All stores are queried in parallel. Within each store, all item searches
 * also run in parallel.
 *
 * @param items  - List of items to find, each with a search query and quantity.
 * @param providers - Store providers to compare against.
 * @param options - Optional tuning parameters.
 */
export async function findCheapestBasket(
  items: BasketItem[],
  providers: StoreProvider[],
  options: BasketOptions = {},
): Promise<BasketComparison> {
  const candidatesPerQuery = options.candidatesPerQuery ?? 5;

  // Query all stores in parallel
  const storeResults = await Promise.all(
    providers.map(async (provider) => {
      const { matched, unmatched } = await resolveStoreBasket(
        provider,
        items,
        candidatesPerQuery,
      );
      const totalPrice = matched.reduce((sum, m) => sum + m.lineTotal, 0);
      return { provider, matched, unmatched, totalPrice };
    }),
  );

  // Calculate savingsVsWorst now that we know all totals
  const worstPrice = Math.max(...storeResults.map((r) => r.totalPrice));

  const allStores: BasketResult[] = storeResults
    .map((r) => ({
      store: r.provider.name as StoreName,
      matched: r.matched,
      unmatched: r.unmatched,
      totalPrice: r.totalPrice,
      savingsVsWorst: worstPrice - r.totalPrice,
    }))
    .sort((a, b) => a.totalPrice - b.totalPrice);

  // Best single store = cheapest store that matched every item
  const bestSingleStore = allStores.find((r) => r.unmatched.length === 0);

  // Per-item best: for each query, find the cheapest matched item across all stores
  const perItemBestMap = new Map<string, MatchedItem>();
  for (const storeResult of storeResults) {
    for (const item of storeResult.matched) {
      const existing = perItemBestMap.get(item.query);
      if (!existing || item.effectivePrice < existing.effectivePrice) {
        perItemBestMap.set(item.query, item);
      }
    }
  }
  const perItemBest = items
    .map((item) => perItemBestMap.get(item.query))
    .filter((m): m is MatchedItem => m !== undefined);

  const perItemBestTotal = perItemBest.reduce((sum, m) => sum + m.lineTotal, 0);

  return { allStores, bestSingleStore, perItemBest, perItemBestTotal };
}
