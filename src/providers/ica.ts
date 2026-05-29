import type {
  NormalizedSearchResult,
} from "../types.js";
import type { StoreProvider } from "./store-provider.js";

// ICA Handla — stub.
//
// The previous implementation pointed at `handla.api.ica.se`, which does not
// resolve. ICA's live storefront (handla.ica.se) hides product search behind a
// CloudFront WAF that requires a browser session + store-selection cookies;
// every direct API path probed (/api/v5/products/search, /stores/{id}/products,
// /api/storeselect/*, …) returns 403 or 404. There is no documented public
// search API.
//
// To make this provider functional you have three realistic paths:
//   1. Headless-browser scraping via Playwright (pick store, run search,
//      intercept the storefront XHR).
//   2. Reverse-engineer the ICA mobile app's API (different host, requires
//      tracking the auth-token flow).
//   3. A partner / commercial agreement with ICA.
//
// Until then, search() returns an empty result so the basket optimizer simply
// excludes ICA rather than crashing.
export class IcaProvider implements StoreProvider {
  readonly name = "ica" as const;

  async search(query: string, page = 0, size = 30): Promise<NormalizedSearchResult> {
    void query;
    return { products: [], totalResults: 0, page, pageSize: size };
  }
}
