import { RateLimiter } from "../rate-limiter.js";
import type {
  NormalizedProduct,
  NormalizedSearchResult,
  NormalizedCategory,
} from "../types.js";
import type { StoreProvider } from "./store-provider.js";

// Coop e-commerce API (undocumented, reverse-engineered from coop.se/handla)
// Endpoints may need updating if Coop changes their backend.
const BASE_URL = "https://www.coop.se";

// Default to Coop Online. Override via COOP_STORE_ID env var.
const DEFAULT_STORE_ID = process.env.COOP_STORE_ID ?? "5080";

interface CoopProductImage {
  src: string;
  [key: string]: unknown;
}

interface CoopPromotion {
  title?: string;
  description?: string;
  splashText?: string;
  newPrice?: number;
  [key: string]: unknown;
}

interface CoopProduct {
  id?: string;
  ean?: string;
  name: string;
  brand?: string;
  manufacturer?: string;
  price: number;
  priceUnit?: string;
  comparePrice?: number;
  comparePriceUnit?: string;
  unitSize?: string;
  displayVolume?: string;
  image?: CoopProductImage;
  images?: CoopProductImage[];
  isAvailable?: boolean;
  inStock?: boolean;
  promotions?: CoopPromotion[];
  offers?: CoopPromotion[];
  [key: string]: unknown;
}

interface CoopSearchResponse {
  items?: CoopProduct[];
  products?: CoopProduct[];
  result?: CoopProduct[];
  totalNumberOfResults?: number;
  totalCount?: number;
  count?: number;
  [key: string]: unknown;
}

function normalizeCoopProduct(p: CoopProduct): NormalizedProduct {
  const id = p.id ?? p.ean ?? "";
  const promotionList = [...(p.promotions ?? []), ...(p.offers ?? [])];
  const promotions = promotionList.map((pr) => ({
    description: pr.title ?? pr.description ?? pr.splashText ?? "",
    discountedPrice: pr.newPrice ?? null,
  }));

  return {
    id: String(id),
    name: p.name,
    brand: p.brand ?? p.manufacturer ?? "",
    price: p.price,
    comparePrice: p.comparePrice ?? 0,
    comparePriceUnit: p.comparePriceUnit ?? p.priceUnit ?? "",
    volume: p.displayVolume ?? p.unitSize ?? "",
    imageUrl: p.image?.src ?? p.images?.[0]?.src ?? null,
    inStock: p.isAvailable !== false && p.inStock !== false,
    promotions,
    store: "coop",
  };
}

function normalizeCoopCategory(raw: Record<string, unknown>): NormalizedCategory {
  const children = Array.isArray(raw.children)
    ? (raw.children as Record<string, unknown>[]).map(normalizeCoopCategory)
    : [];
  return {
    id: String(raw.id ?? raw.categoryCode ?? ""),
    name: String(raw.name ?? raw.title ?? ""),
    path: String(raw.url ?? raw.slug ?? ""),
    children,
  };
}

export class CoopProvider implements StoreProvider {
  readonly name = "coop" as const;
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
    // Coop product search endpoint
    // TODO: verify endpoint against live site if response shape changes
    const params = new URLSearchParams({
      query,
      page: String(page),
      pageSize: String(size),
      storeId: this.storeId,
    });
    const response = await this.request(`/api/ecommerce/products/search?${params}`);
    if (!response.ok) {
      throw new Error(`Coop search failed: ${response.status}`);
    }
    const data = (await response.json()) as CoopSearchResponse;
    const products = data.items ?? data.products ?? data.result ?? [];
    return {
      products: products.map(normalizeCoopProduct),
      totalResults: data.totalNumberOfResults ?? data.totalCount ?? data.count ?? products.length,
      page,
      pageSize: size,
    };
  }

  async getCategories(): Promise<NormalizedCategory[]> {
    const response = await this.request(`/api/ecommerce/categories?storeId=${this.storeId}`);
    if (!response.ok) {
      throw new Error(`Coop categories failed: ${response.status}`);
    }
    const data = (await response.json()) as unknown;
    const items = Array.isArray(data) ? data : [(data as Record<string, unknown>).categories ?? data];
    return (items as Record<string, unknown>[]).map(normalizeCoopCategory);
  }
}
