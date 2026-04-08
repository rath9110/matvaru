// ── Types (self-contained — not imported from server) ─────────────────────

interface BasketItem {
  query: string;
  quantity: number;
}

interface NormalizedProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  comparePrice: number;
  comparePriceUnit: string;
  volume: string;
  imageUrl: string | null;
  inStock: boolean;
  promotions: { description: string; discountedPrice: number | null }[];
  store: string;
}

interface MatchedItem {
  query: string;
  product: NormalizedProduct;
  quantity: number;
  effectivePrice: number;
  lineTotal: number;
}

interface UnmatchedItem {
  query: string;
  quantity: number;
}

interface BasketResult {
  store: string;
  matched: MatchedItem[];
  unmatched: UnmatchedItem[];
  totalPrice: number;
  savingsVsWorst: number;
}

interface BasketComparison {
  allStores: BasketResult[];
  bestSingleStore: BasketResult | undefined;
  perItemBest: MatchedItem[];
  perItemBestTotal: number;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatPrice(n: number): string {
  return n.toFixed(2).replace(".", ",") + " kr";
}

function storeDisplayName(store: string): string {
  const names: Record<string, string> = {
    willys: "Willys",
    ica: "ICA",
    coop: "Coop",
    lidl: "Lidl",
  };
  return names[store] ?? store.charAt(0).toUpperCase() + store.slice(1);
}

// ── Input parsing ──────────────────────────────────────────────────────────

/**
 * Parse a freeform shopping list into BasketItems.
 *
 * Supported quantity formats (case-insensitive):
 *   "2x mjölk"       leading number + x
 *   "2 x mjölk"      leading number + space + x
 *   "mjölk x2"       trailing x + number
 *   "mjölk ×2"       trailing × + number
 *   "2 mjölk"        leading bare number (only when followed by a letter)
 *   "mjölk"          no quantity → defaults to 1
 */
function parseBasketInput(text: string): BasketItem[] {
  const items: BasketItem[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;

    let query = line;
    let quantity = 1;

    // 1. Leading number + optional x/×: "2x mjölk" or "2 x mjölk"
    const leadingX = line.match(/^(\d+)\s*[x×]\s*(.+)$/i);
    if (leadingX) {
      quantity = parseInt(leadingX[1], 10);
      query = leadingX[2].trim();
    } else {
      // 2. Trailing x/× + number: "mjölk x2" or "mjölk ×2"
      const trailingX = line.match(/^(.+)\s+[x×]\s*(\d+)$/i);
      if (trailingX) {
        query = trailingX[1].trim();
        quantity = parseInt(trailingX[2], 10);
      } else {
        // 3. Leading bare number followed by letter: "2 mjölk" but not "500g pasta"
        const leadingNum = line.match(/^(\d+)\s+([a-zA-ZåäöÅÄÖ].*)$/);
        if (leadingNum) {
          quantity = parseInt(leadingNum[1], 10);
          query = leadingNum[2].trim();
        }
      }
    }

    if (!query) continue;
    if (quantity < 1) quantity = 1;

    items.push({ query, quantity });
  }

  return items;
}

// ── API ────────────────────────────────────────────────────────────────────

// Server injects window.__API_SECRET__ into the served HTML when API_SECRET is set.
const apiSecret = (window as unknown as Record<string, unknown>).__API_SECRET__ as string | undefined;

async function compare(items: BasketItem[]): Promise<BasketComparison> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiSecret) headers["Authorization"] = `Bearer ${apiSecret}`;

  const res = await fetch("/api/compare", {
    method: "POST",
    headers,
    body: JSON.stringify({ items }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<BasketComparison>;
}

// ── Rendering ──────────────────────────────────────────────────────────────

function buildItemsTable(matched: MatchedItem[], totalPrice: number, showStore = false): HTMLElement {
  const table = document.createElement("table");
  table.className = "items-table";

  const headerCols = ["Din sökning", "Matchad produkt", "Jmf-pris", "Pris/st", "Totalt"];
  if (showStore) headerCols.splice(2, 0, "Butik");

  table.innerHTML = `
    <thead>
      <tr>${headerCols.map((h) => `<th>${h}</th>`).join("")}</tr>
    </thead>
    <tbody>
      ${matched
        .map((item) => {
          const promoHtml =
            item.product.promotions.length > 0
              ? `<span class="promo-badge">Rea</span>`
              : "";
          const comparePriceHtml =
            item.product.comparePrice > 0 && item.product.comparePriceUnit
              ? `<span class="compare-price">${formatPrice(item.product.comparePrice)}/${item.product.comparePriceUnit}</span>`
              : "";
          const storeCol = showStore
            ? `<td class="store-col">${storeDisplayName(item.product.store)}</td>`
            : "";
          return `
            <tr>
              <td class="query-cell">${escHtml(item.query)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}</td>
              <td>
                <span class="product-name">${escHtml(item.product.name)}</span>
                ${item.product.volume ? `<span class="product-volume">${escHtml(item.product.volume)}</span>` : ""}
                ${promoHtml}
              </td>
              ${storeCol}
              <td>${comparePriceHtml}</td>
              <td>${formatPrice(item.effectivePrice)}</td>
              <td class="line-total">${formatPrice(item.lineTotal)}</td>
            </tr>`;
        })
        .join("")}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="${showStore ? 5 : 4}" class="total-label">Totalt</td>
        <td class="total-value line-total">${formatPrice(totalPrice)}</td>
      </tr>
    </tfoot>
  `;
  return table;
}

function buildUnmatchedSection(unmatched: UnmatchedItem[]): HTMLElement {
  const div = document.createElement("div");
  div.className = "unmatched-section";
  div.innerHTML = `
    <strong>Hittades inte på den här butiken:</strong>
    <ul>${unmatched.map((u) => `<li>${escHtml(u.query)}${u.quantity > 1 ? ` × ${u.quantity}` : ""}</li>`).join("")}</ul>
  `;
  return div;
}

function buildStoreDetails(result: BasketResult): HTMLElement {
  const div = document.createElement("div");
  div.className = "store-details";

  if (result.matched.length > 0) {
    div.appendChild(buildItemsTable(result.matched, result.totalPrice));
  }
  if (result.unmatched.length > 0) {
    div.appendChild(buildUnmatchedSection(result.unmatched));
  }
  return div;
}

function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderResults(result: BasketComparison, container: HTMLElement): void {
  container.innerHTML = "";

  // ── Winner card ──────────────────────────────────────────────────────────
  if (result.bestSingleStore) {
    const bs = result.bestSingleStore;
    const card = document.createElement("div");
    card.className = "winner-card";
    card.dataset.store = bs.store;
    card.innerHTML = `
      <div class="winner-label">Billigaste hela korgen</div>
      <div class="winner-store">${storeDisplayName(bs.store)}</div>
      <div class="winner-price">${formatPrice(bs.totalPrice)}</div>
      ${bs.savingsVsWorst > 0.005 ? `<div class="winner-savings">Sparar ${formatPrice(bs.savingsVsWorst)} vs dyraste butik</div>` : ""}
    `;
    container.appendChild(card);
  }

  // ── All stores ranked ────────────────────────────────────────────────────
  const heading = document.createElement("p");
  heading.className = "stores-heading";
  heading.textContent = "Alla butiker";
  container.appendChild(heading);

  result.allStores.forEach((storeResult, index) => {
    const isWinner = result.bestSingleStore?.store === storeResult.store;
    const row = document.createElement("div");
    row.className = "store-row" + (isWinner ? " is-winner" : "");
    row.dataset.store = storeResult.store;

    const missingCount = storeResult.unmatched.length;
    const totalItems = storeResult.matched.length + missingCount;
    const coverageText =
      missingCount > 0
        ? `${missingCount} av ${totalItems} varor saknas`
        : "Alla varor hittades";
    const coverageClass = missingCount > 0 ? "store-coverage has-missing" : "store-coverage";

    const summary = document.createElement("div");
    summary.className = "store-summary";
    summary.innerHTML = `
      <span class="store-rank">#${index + 1}</span>
      <span class="store-name">${storeDisplayName(storeResult.store)}</span>
      <span class="store-price">${storeResult.totalPrice > 0 ? formatPrice(storeResult.totalPrice) : "—"}</span>
      <span class="${coverageClass}">${coverageText}</span>
      <button class="toggle-details" aria-expanded="${isWinner ? "true" : "false"}">
        ${isWinner ? "Dölj detaljer" : "Visa detaljer"}
      </button>
    `;
    row.appendChild(summary);

    const details = buildStoreDetails(storeResult);
    if (!isWinner) details.hidden = true;
    row.appendChild(details);

    // Toggle on button click
    const btn = summary.querySelector<HTMLButtonElement>(".toggle-details")!;
    btn.addEventListener("click", () => {
      const expanded = btn.getAttribute("aria-expanded") === "true";
      details.hidden = expanded;
      btn.setAttribute("aria-expanded", String(!expanded));
      btn.textContent = expanded ? "Visa detaljer" : "Dölj detaljer";
    });

    container.appendChild(row);
  });

  // ── Per-item best ────────────────────────────────────────────────────────
  if (result.perItemBest.length > 0) {
    const details = document.createElement("details");
    details.className = "per-item-best";

    const summary = document.createElement("summary");
    summary.textContent = `Teoretiskt lägsta pris (blanda butiker): ${formatPrice(result.perItemBestTotal)}`;
    details.appendChild(summary);

    details.appendChild(buildItemsTable(result.perItemBest, result.perItemBestTotal, true));
    container.appendChild(details);
  }
}

// ── App init ───────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  const textarea = document.getElementById("basket-input") as HTMLTextAreaElement;
  const btn = document.getElementById("compare-btn") as HTMLButtonElement;
  const results = document.getElementById("results") as HTMLDivElement;

  // Restore saved basket
  const saved = localStorage.getItem("basket");
  if (saved) textarea.value = saved;

  // Persist on change
  textarea.addEventListener("input", () => {
    localStorage.setItem("basket", textarea.value);
  });

  async function runCompare(): Promise<void> {
    const items = parseBasketInput(textarea.value);

    if (items.length === 0) {
      results.innerHTML = `<p class="error">Inga varor att söka efter. Fyll i minst en rad.</p>`;
      return;
    }

    btn.disabled = true;
    btn.textContent = "Söker…";
    results.innerHTML = "";

    try {
      const result = await compare(items);
      renderResults(result, results);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      results.innerHTML = `<p class="error">Fel: ${escHtml(msg)}</p>`;
    } finally {
      btn.disabled = false;
      btn.textContent = "Hitta billigaste butik";
    }
  }

  btn.addEventListener("click", runCompare);

  // Ctrl+Enter / Cmd+Enter submits from textarea
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      runCompare();
    }
  });
});
