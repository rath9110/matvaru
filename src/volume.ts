/**
 * Volume/weight normalization for cross-store product comparison.
 *
 * Swedish grocery products use mixed units: "1 l", "500 ml", "1,5 l",
 * "400 g", "1 kg", "6-pack", etc. To compare prices reliably we normalize
 * everything to a canonical unit per dimension:
 *   - Liquid  → liters  (l)
 *   - Weight  → kilograms (kg)
 *   - Count   → pieces (st) — no conversion, just the raw count
 *
 * Returns null for anything we can't parse (multi-packs with mixed units,
 * "ca 500 g", free-text values like "portion"). Callers should fall back to
 * raw comparePrice from the store API in that case.
 */

export type CanonicalUnit = "l" | "kg" | "st";

export interface ParsedVolume {
  amount: number;
  unit: CanonicalUnit;
}

// Unit aliases → canonical unit + multiplier to canonical
const UNIT_MAP: Record<string, { unit: CanonicalUnit; factor: number }> = {
  // Liquid
  l: { unit: "l", factor: 1 },
  liter: { unit: "l", factor: 1 },
  litre: { unit: "l", factor: 1 },
  dl: { unit: "l", factor: 0.1 },
  cl: { unit: "l", factor: 0.01 },
  ml: { unit: "l", factor: 0.001 },
  // Weight
  kg: { unit: "kg", factor: 1 },
  kilo: { unit: "kg", factor: 1 },
  hg: { unit: "kg", factor: 0.1 },
  g: { unit: "kg", factor: 0.001 },
  gram: { unit: "kg", factor: 0.001 },
  // Count
  st: { unit: "st", factor: 1 },
  stk: { unit: "st", factor: 1 },
  pack: { unit: "st", factor: 1 },
  förp: { unit: "st", factor: 1 },
};

/**
 * Parse a volume/weight string into a canonical amount + unit.
 *
 * Examples:
 *   "1 l"      → { amount: 1,    unit: "l"  }
 *   "500 ml"   → { amount: 0.5,  unit: "l"  }
 *   "1,5 l"    → { amount: 1.5,  unit: "l"  }
 *   "400 g"    → { amount: 0.4,  unit: "kg" }
 *   "1 kg"     → { amount: 1,    unit: "kg" }
 *   "6 st"     → { amount: 6,    unit: "st" }
 */
export function parseVolume(raw: string): ParsedVolume | null {
  if (!raw) return null;

  // Normalise: lowercase, Swedish decimal comma → dot, collapse whitespace
  const s = raw.toLowerCase().replace(",", ".").replace(/\s+/g, " ").trim();

  // Match: optional "ca " prefix, number (int or decimal), optional space, unit
  const match = s.match(/^(?:ca\.?\s*)?(\d+(?:\.\d+)?)\s*([a-zåäö]+)/);
  if (!match) return null;

  const amount = parseFloat(match[1]);
  const rawUnit = match[2];

  const mapping = UNIT_MAP[rawUnit];
  if (!mapping || amount <= 0) return null;

  return { amount: amount * mapping.factor, unit: mapping.unit };
}

/**
 * Compute a normalized price per canonical unit (kr/l, kr/kg, kr/st).
 * Returns null if the volume string can't be parsed.
 *
 * This gives a reliable apples-to-apples comparison: a 1.5 l bottle at 25 kr
 * gives 16.67 kr/l, while a 1 l carton at 18 kr gives 18 kr/l — clearly
 * cheaper per litre despite the higher pack price.
 */
export function pricePerUnit(price: number, volume: string): { value: number; unit: CanonicalUnit } | null {
  const parsed = parseVolume(volume);
  if (!parsed || parsed.amount === 0) return null;
  return { value: price / parsed.amount, unit: parsed.unit };
}
