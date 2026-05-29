import type {
  NormalizedProduct,
  NormalizedSearchResult,
} from "../types.js";
import type { StoreProvider } from "./store-provider.js";

// Lidl Sweden — stub.
//
// Lidl Sverige does not sell groceries online and exposes no product/price API.
// The only structured price source is the weekly leaflet ("Reklamblad" at
// www.lidl.se/c/reklamblad/s10018018), served as paginated PDFs/images — not
// machine-readable JSON. The previous `/api/offers` URL in this file was
// fabricated and 404s.
//
// To make this provider functional you would need to OCR / parse the weekly
// reklamblad, or partner with Lidl directly. Until then, search() returns an
// empty result and getPromotions() returns an empty list so the basket
// optimizer simply excludes Lidl.
export class LidlProvider implements StoreProvider {
  readonly name = "lidl" as const;

  async search(query: string, page = 0, size = 30): Promise<NormalizedSearchResult> {
    void query;
    return { products: [], totalResults: 0, page, pageSize: size };
  }

  async getPromotions(): Promise<NormalizedProduct[]> {
    return [];
  }
}
