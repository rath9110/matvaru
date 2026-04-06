import { RateLimiter } from "../rate-limiter.js";
import type {
  NormalizedProduct,
  NormalizedSearchResult,
  NormalizedCategory,
} from "../types.js";
import type { StoreProvider } from "./store-provider.js";

// ICA Handla e-commerce API (undocumented, reverse-engineered from handla.ica.se)
// Base URL and endpoints may need updating if ICA changes their backend.
const BASE_URL = "https://handla.api.ica.se";

// Default to ICA Maxi Online (storeId 1300). Override via ICA_STORE_ID env var.
const DEFAULT_STORE_ID = process.env.ICA_STORE_ID ?? "1300";

interface IcaProductImage {
  url: string;
  [key: string]: unknown;
}

interface IcaOffer {
  offerType: string;
  articleDescription: string;
  conditionDescription?: string;
  price?: number;
  [key: string]: unknown;
}

interface IcaProduct {
  id: string;
  name: string;
  brand?: string;
  price: number;
  priceComparison?: string;   // e.g. "29,90 kr/kg"
  comparePrice?: number;
  comparePriceUnit?: string;
  unitDescription?: string;   // e.g. "1 l"
  image?: IcaProductImage;
  inStock?: boolean;
  offers?: IcaOffer[];
  [key: string]: unknown;
}

interface IcaSearchResponse {
  items?: IcaProduct[];
  products?: IcaProduct[];
  totalCount?: number;
  count?: number;
  [key: string]: unknown;
}

function parseIcaComparePrice(raw: string | undefined, fallback: number | undefined): number {
  if (fallback !== undefined && fallback > 0) return fallback;
  if (!raw) return 0;
  const match = raw.replace(",", ".").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

function parseIcaComparePriceUnit(raw: string | undefined, fallback: string | undefined): string {
  if (fallback) return fallback;
  if (!raw) return "";
  const match = raw.match(/\/(\w+)\s*$/);
  return match ? match[1] : "";
}

function normalizeIcaProduct(p: IcaProduct): NormalizedProduct {
  const promotions = (p.offers ?? []).map((o) => ({
    description: o.articleDescription ?? o.conditionDescription ?? o.offerType ?? "",
    discountedPrice: o.price ?? null,
  }));

  return {
    id: String(p.id),
    name: p.name,
    brand: p.brand ?? "",
    price: p.price,
    comparePrice: parseIcaComparePrice(p.priceComparison, p.comparePrice),
    comparePriceUnit: parseIcaComparePriceUnit(p.priceComparison, p.comparePriceUnit),
    volume: p.unitDescription ?? "",
    imageUrl: p.image?.url ?? null,
    inStock: p.inStock !== false,
    promotions,
    store: "ica",
  };
}

function normalizeIcaCategory(raw: Record<string, unknown>): NormalizedCategory {
  const children = Array.isArray(raw.children)
    ? (raw.children as Record<string, unknown>[]).map(normalizeIcaCategory)
    : [];
  return {
    id: String(raw.id ?? raw.categoryId ?? ""),
    name: String(raw.name ?? raw.title ?? ""),
    path: String(raw.url ?? raw.path ?? ""),
    children,
  };
}

export class IcaProvider implements StoreProvider {
  readonly name = "ica" as const;
  private storeId: string;
  private limiter = new RateLimiter(200);

  constructor(storeId = DEFAULT_STORE_ID) {
    this.storeId = storeId;
  }

  private async request(path: string): Promise<Response> {
    await this.limiter.throttle();
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "sv-SE",
      },
    });
    return response;
  }

  async search(query: string, page = 0, size = 30): Promise<NormalizedSearchResult> {
    // ICA Handla product search endpoint
    // TODO: verify endpoint against live site if response shape changes
    const params = new URLSearchParams({
      q: query,
      page: String(page),
      pageSize: String(size),
      store: this.storeId,
    });
    const response = await this.request(`/api/catalog/v2/retailer/${this.storeId}/products/search?${params}`);
    if (!response.ok) {
      throw new Error(`ICA search failed: ${response.status}`);
    }
    const data = (await response.json()) as IcaSearchResponse;
    const products = data.items ?? data.products ?? [];
    return {
      products: products.map(normalizeIcaProduct),
      totalResults: data.totalCount ?? data.count ?? products.length,
      page,
      pageSize: size,
    };
  }

  async getCategories(): Promise<NormalizedCategory[]> {
    const response = await this.request(`/api/catalog/v2/retailer/${this.storeId}/categories`);
    if (!response.ok) {
      throw new Error(`ICA categories failed: ${response.status}`);
    }
    const data = (await response.json()) as unknown;
    const items = Array.isArray(data) ? data : [(data as Record<string, unknown>).categories ?? data];
    return (items as Record<string, unknown>[]).map(normalizeIcaCategory);
  }
}
