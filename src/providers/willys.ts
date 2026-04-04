import { WillysApi } from "../willys-api.js";
import { encryptCredential } from "../crypto.js";
import type {
  NormalizedProduct,
  NormalizedSearchResult,
  NormalizedCategory,
  Product,
  Category,
  Promotion,
} from "../types.js";
import type { StoreProvider, StoreCredentials } from "./store-provider.js";

function parseComparePrice(raw: string): number {
  // Willys comparePrice is formatted like "29,90 kr/kg" or "29.90/kg" — extract the leading number
  const match = raw.replace(",", ".").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function normalizePromotion(p: Promotion) {
  const desc = p.description ?? (p.code ? String(p.code) : "");
  // Willys promotions don't reliably expose a discounted price in the search result
  return { description: desc, discountedPrice: null };
}

function normalizeProduct(p: Product): NormalizedProduct {
  return {
    id: p.code,
    name: p.name,
    brand: p.manufacturer ?? "",
    price: p.priceValue,
    comparePrice: parseComparePrice(p.comparePrice ?? "0"),
    comparePriceUnit: p.comparePriceUnit ?? "",
    volume: p.displayVolume ?? "",
    imageUrl: p.thumbnail?.url ?? p.image?.url ?? null,
    inStock: !p.outOfStock && p.online !== false,
    promotions: (p.potentialPromotions ?? []).map(normalizePromotion),
    store: "willys",
  };
}

function normalizeCategory(c: Category): import("../types.js").NormalizedCategory {
  return {
    id: c.id,
    name: c.title,
    path: c.url,
    children: c.children.map(normalizeCategory),
  };
}

export class WillysProvider implements StoreProvider {
  readonly name = "willys" as const;
  private api = new WillysApi();

  async login(credentials: StoreCredentials): Promise<void> {
    await this.api.login(credentials.username, credentials.password);
  }

  async logout(): Promise<void> {
    await this.api.logout();
  }

  async search(query: string, page = 0, size = 30): Promise<NormalizedSearchResult> {
    const raw = await this.api.search(query, page, size);
    return {
      products: raw.results.map(normalizeProduct),
      totalResults: raw.pagination.totalNumberOfResults,
      page: raw.pagination.currentPage,
      pageSize: raw.pagination.pageSize,
    };
  }

  async getCategories(): Promise<import("../types.js").NormalizedCategory[]> {
    const tree = await this.api.getCategories();
    return [normalizeCategory(tree)];
  }
}
