import type {
  StoreName,
  NormalizedSearchResult,
  NormalizedCategory,
  NormalizedProduct,
} from "../types.js";

export interface StoreCredentials {
  username: string;
  password: string;
}

export interface StoreProvider {
  readonly name: StoreName;

  /**
   * Authenticate with the store. Only required for stores that gate product
   * search behind a login. Providers that offer public search may leave this
   * unimplemented.
   */
  login?(credentials: StoreCredentials): Promise<void>;

  /** End the session. Only needed if login() is implemented. */
  logout?(): Promise<void>;

  /**
   * Search for products matching a free-text query.
   * All providers must implement this — it is the core method used by the
   * basket optimizer.
   */
  search(query: string, page?: number, size?: number): Promise<NormalizedSearchResult>;

  /**
   * Return the store's category tree. Optional — implement when available.
   */
  getCategories?(): Promise<NormalizedCategory[]>;

  /**
   * Return currently active promotions / weekly deals.
   * Used by the basket optimizer to surface sale prices.
   */
  getPromotions?(): Promise<NormalizedProduct[]>;
}
