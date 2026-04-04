// ─── Store-agnostic normalized types ─────────────────────────────────────────

export type StoreName = "willys" | "ica" | "lidl" | "coop";

export interface NormalizedPromotion {
  description: string;
  /** Price after discount, null if unknown */
  discountedPrice: number | null;
}

export interface NormalizedProduct {
  /** Store-specific product identifier */
  id: string;
  name: string;
  brand: string;
  /** Regular price in SEK */
  price: number;
  /** Price per unit of measure (e.g. per kg, per liter) */
  comparePrice: number;
  /** Unit for comparePrice, e.g. "kg", "l", "st" */
  comparePriceUnit: string;
  /** Human-readable volume/weight, e.g. "1 l", "500 g" */
  volume: string;
  imageUrl: string | null;
  inStock: boolean;
  promotions: NormalizedPromotion[];
  store: StoreName;
}

export interface NormalizedSearchResult {
  products: NormalizedProduct[];
  totalResults: number;
  page: number;
  pageSize: number;
}

export interface NormalizedCategory {
  id: string;
  name: string;
  path: string;
  children: NormalizedCategory[];
}

// ─── Basket comparison types ──────────────────────────────────────────────────

export interface BasketItem {
  /** Search query, e.g. "mjölk 3%", "pasta fusilli" */
  query: string;
  quantity: number;
}

export interface MatchedItem {
  query: string;
  product: NormalizedProduct;
  quantity: number;
  /** Total price for this line (product.price * quantity) */
  lineTotal: number;
}

export interface BasketResult {
  store: StoreName;
  items: MatchedItem[];
  /** Sum of all lineTotal values */
  totalPrice: number;
  /** How much cheaper/more expensive vs the most expensive single-store option */
  savingsVsWorst: number;
}

// ─── Willys-specific types ────────────────────────────────────────────────────

export interface Customer {
  uid: string;
  name: string;
  firstName: string;
  lastName: string;
  email: string;
  socialSecurityNumer: string;
  storeId: string;
  homeStoreId: string;
  displayUid: string;
  defaultBillingAddress: Address | null;
  defaultShippingAddress: Address | null;
  linkedAccounts: { name: string; isPrimary: boolean }[];
  bonusInfo: Record<string, unknown>;
}

export interface Address {
  id: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2: string;
  town: string;
  postalCode: string;
  cellphone: string;
  email: string;
  country: { isocode: string; name: string };
  formattedAddress: string;
  longitude: number;
  latitude: number;
}

export interface Product {
  name: string;
  code: string;
  price: string;
  priceValue: number;
  priceUnit: string;
  priceNoUnit: string;
  comparePrice: string;
  comparePriceUnit: string;
  productLine2: string;
  manufacturer: string;
  displayVolume: string;
  image: ProductImage | null;
  thumbnail: ProductImage | null;
  labels: string[];
  outOfStock: boolean;
  online: boolean;
  addToCartDisabled: boolean;
  productBasketType: { code: string; type: string };
  incrementValue: number;
  potentialPromotions: Promotion[];
  savingsAmount: string | null;
  depositPrice: string;
  averageWeight: number | null;
}

export interface ProductImage {
  imageType: string;
  format: string;
  url: string;
  altText: string | null;
}

export interface Promotion {
  code?: string;
  description?: string;
  [key: string]: unknown;
}

export interface Pagination {
  pageSize: number;
  currentPage: number;
  sort: string | null;
  numberOfPages: number;
  totalNumberOfResults: number;
  allProductsInCategoriesCount: number;
  allProductsInSearchCount: number;
}

export interface SearchResult {
  results: Product[];
  pagination: Pagination;
  facets: unknown[];
  freeTextSearch: string | null;
  categoryCode: string | null;
  categoryName: string | null;
  breadcrumbs: unknown[];
  sorts: unknown[];
}

export interface Category {
  id: string;
  category: string;
  title: string;
  url: string;
  valid: boolean;
  children: Category[];
}

export interface Cart {
  products: CartProduct[];
  totalPrice: string;
  totalItems: number;
  totalUnitCount: number;
  totalDiscount: string;
  totalTax: string;
  subTotalWithDiscounts: string;
  deliveryCost: string;
  paymentType: string;
  appliedVouchers: unknown[];
  taxes: Record<string, unknown>;
  isocode: string;
}

export interface CartProduct {
  code: string;
  name: string;
  price: string;
  priceValue: number;
  quantity: number;
  pickQuantity: number;
  totalPrice: string;
  manufacturer: string;
  displayVolume: string;
  comparePrice: string;
  comparePriceUnit: string;
  image: ProductImage | null;
  productBasketType: { code: string; type: string };
  [key: string]: unknown;
}
