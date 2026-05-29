import { RateLimiter } from "../rate-limiter.js";
import type {
  NormalizedProduct,
  NormalizedSearchResult,
} from "../types.js";
import type { StoreProvider } from "./store-provider.js";

// Coop ecommerce search — Loop54-backed personalization API used by coop.se/handla.
// Verified against the live storefront 2026-05.
const BASE_URL = "https://external.api.coop.se/personalization";

// Public subscription key embedded in www.coop.se/handla; rotated occasionally.
// If rotation happens, refresh from window.coopSettings.serviceAccess.hybrisApiSubscriptionKey.
const SUBSCRIPTION_KEY =
  process.env.COOP_SUBSCRIPTION_KEY ?? "3becf0ce306f41a1ae94077c16798187";

// Default store: Coop Online (rikstäckande). The /handla page reports
// defaultStoreId 251300 for non-localized sessions. Smaller numeric IDs (e.g.
// 5080) are physical-store codes and return zero search results.
const DEFAULT_STORE_ID = process.env.COOP_STORE_ID ?? "251300";

interface CoopPriceData {
  b2cPrice?: number;
  b2bPrice?: number;
}

interface CoopComparativeUnit {
  unit?: string;
  text?: string;
}

interface CoopProduct {
  id?: string;
  ean?: string;
  name?: string;
  brand?: string;
  manufacturer?: string;
  imageUrl?: string;
  salesPriceData?: CoopPriceData;
  piecePriceData?: CoopPriceData;
  comparativePriceData?: CoopPriceData;
  comparativePriceUnit?: CoopComparativeUnit;
  comparativePriceText?: string;
  packageSize?: number | string;
  packageSizeUnit?: string;
  packageSizeInformation?: string;
  salesUnit?: string;
  availableOnline?: boolean;
  promotion?: {
    text?: string;
    salesPriceData?: CoopPriceData;
  };
  [key: string]: unknown;
}

interface CoopSearchResponse {
  queryUsed?: string;
  results?: {
    count?: number;
    items?: CoopProduct[];
  };
}

function normalizeCoopProduct(p: CoopProduct): NormalizedProduct {
  // For weight-priced items Coop returns piecePriceData (per styck) AND
  // salesPriceData (per kg). The pack price the customer pays is piecePriceData
  // when present; otherwise fall back to salesPriceData.
  const piece = p.piecePriceData?.b2cPrice;
  const sales = p.salesPriceData?.b2cPrice ?? 0;
  const price = piece && piece > 0 ? piece : sales;

  const promotionPrice = p.promotion?.salesPriceData?.b2cPrice;
  const promotions = promotionPrice && promotionPrice < price
    ? [{ description: p.promotion?.text ?? "Erbjudande", discountedPrice: promotionPrice }]
    : [];

  return {
    id: String(p.id ?? p.ean ?? ""),
    name: p.name ?? "",
    brand: p.brand ?? p.manufacturer ?? "",
    price,
    comparePrice: p.comparativePriceData?.b2cPrice ?? 0,
    comparePriceUnit: p.comparativePriceUnit?.unit ?? "",
    volume: p.packageSizeInformation ?? "",
    imageUrl: p.imageUrl ?? null,
    inStock: p.availableOnline !== false,
    promotions,
    store: "coop",
  };
}

export class CoopProvider implements StoreProvider {
  readonly name = "coop" as const;
  private storeId: string;
  private limiter = new RateLimiter(200);

  constructor(storeId = DEFAULT_STORE_ID) {
    this.storeId = storeId;
  }

  async search(query: string, page = 0, size = 30): Promise<NormalizedSearchResult> {
    await this.limiter.throttle();

    const url =
      `${BASE_URL}/search/products?api-version=v1` +
      `&store=${encodeURIComponent(this.storeId)}` +
      `&device=desktop&direct=false`;

    const body = JSON.stringify({
      query,
      resultsOptions: { skip: page * size, take: size },
    });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": SUBSCRIPTION_KEY,
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
        Origin: "https://www.coop.se",
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Coop search failed: ${response.status}`);
    }

    const data = (await response.json()) as CoopSearchResponse;
    const items = data.results?.items ?? [];
    return {
      products: items.map(normalizeCoopProduct),
      totalResults: data.results?.count ?? items.length,
      page,
      pageSize: size,
    };
  }
}
