import { RateLimiter } from "../rate-limiter.js";
import type {
  NormalizedProduct,
  NormalizedSearchResult,
} from "../types.js";
import type { StoreProvider } from "./store-provider.js";

// Lidl Sweden API (undocumented, reverse-engineered from lidl.se)
// Lidl does not expose a general product search — this provider uses their
// weekly offers API as a best-effort product source.
// TODO: investigate whether lidl.se exposes a search endpoint.
const BASE_URL = "https://www.lidl.se";

interface LidlPrice {
  price: number;
  currency?: string;
  isDiscounted?: boolean;
  regularPrice?: number;
  discount?: number;
}

interface LidlImage {
  url?: string;
  src?: string;
  [key: string]: unknown;
}

interface LidlOffer {
  id?: string;
  productId?: string;
  name?: string;
  title?: string;
  brand?: string;
  price?: number | LidlPrice;
  regularPrice?: number;
  comparePrice?: number;
  comparePriceUnit?: string;
  volume?: string;
  quantity?: string;
  image?: LidlImage;
  images?: LidlImage[];
  isAvailable?: boolean;
  description?: string;
  offerValidTo?: string;
  [key: string]: unknown;
}

interface LidlOffersResponse {
  offers?: LidlOffer[];
  items?: LidlOffer[];
  data?: LidlOffer[];
  [key: string]: unknown;
}

function extractLidlPrice(raw: number | LidlPrice | undefined): { price: number; regularPrice: number | null } {
  if (!raw) return { price: 0, regularPrice: null };
  if (typeof raw === "number") return { price: raw, regularPrice: null };
  return {
    price: raw.price ?? 0,
    regularPrice: raw.regularPrice ?? (raw.isDiscounted ? raw.price + (raw.discount ?? 0) : null),
  };
}

function normalizeOffer(o: LidlOffer): NormalizedProduct {
  const { price, regularPrice } = extractLidlPrice(o.price as number | LidlPrice | undefined);
  const imageUrl =
    o.image?.url ?? o.image?.src ?? o.images?.[0]?.url ?? o.images?.[0]?.src ?? null;

  const promotions =
    regularPrice !== null && regularPrice > price
      ? [{ description: o.description ?? "Veckans erbjudande", discountedPrice: price }]
      : [];

  return {
    id: String(o.id ?? o.productId ?? ""),
    name: o.name ?? o.title ?? "",
    brand: o.brand ?? "",
    price: regularPrice ?? price,
    comparePrice: o.comparePrice ?? 0,
    comparePriceUnit: o.comparePriceUnit ?? "",
    volume: o.volume ?? o.quantity ?? "",
    imageUrl,
    inStock: o.isAvailable !== false,
    promotions,
    store: "lidl",
  };
}

export class LidlProvider implements StoreProvider {
  readonly name = "lidl" as const;
  private limiter = new RateLimiter(200);

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

  private async fetchOffers(): Promise<NormalizedProduct[]> {
    // Lidl Sweden weekly offers endpoint
    // TODO: verify endpoint; Lidl may require different paths per region/week
    const response = await this.request("/api/offers");
    if (!response.ok) {
      throw new Error(`Lidl offers failed: ${response.status}`);
    }
    const data = (await response.json()) as LidlOffersResponse;
    const offers = data.offers ?? data.items ?? data.data ?? [];
    return offers.map(normalizeOffer);
  }

  /**
   * Lidl does not expose a full product catalog search. This implementation
   * fetches current weekly offers and filters by query string.
   * Only products on offer this week will appear in results.
   */
  async search(query: string, page = 0, size = 30): Promise<NormalizedSearchResult> {
    const all = await this.fetchOffers();
    const q = query.toLowerCase();
    const filtered = all.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.volume.toLowerCase().includes(q),
    );
    const start = page * size;
    return {
      products: filtered.slice(start, start + size),
      totalResults: filtered.length,
      page,
      pageSize: size,
    };
  }

  async getPromotions(): Promise<NormalizedProduct[]> {
    return this.fetchOffers();
  }
}
