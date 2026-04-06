import { describe, it, expect } from "vitest";
import { parseVolume, pricePerUnit } from "./volume.js";

describe("parseVolume", () => {
  // ── Litres ─────────────────────────────────────────────────────────────────

  it("parses whole litres", () => {
    expect(parseVolume("1 l")).toEqual({ amount: 1, unit: "l" });
    expect(parseVolume("2 l")).toEqual({ amount: 2, unit: "l" });
  });

  it("parses litres without space", () => {
    expect(parseVolume("1l")).toEqual({ amount: 1, unit: "l" });
  });

  it("parses 'liter' and 'litre' aliases", () => {
    expect(parseVolume("1 liter")).toEqual({ amount: 1, unit: "l" });
    expect(parseVolume("1 litre")).toEqual({ amount: 1, unit: "l" });
  });

  it("parses millilitres and converts to litres", () => {
    expect(parseVolume("500 ml")).toEqual({ amount: 0.5, unit: "l" });
    expect(parseVolume("250 ml")).toEqual({ amount: 0.25, unit: "l" });
    expect(parseVolume("1000 ml")).toEqual({ amount: 1, unit: "l" });
  });

  it("parses decilitres and converts to litres", () => {
    expect(parseVolume("5 dl")).toEqual({ amount: 0.5, unit: "l" });
  });

  it("parses centilitres and converts to litres", () => {
    expect(parseVolume("33 cl")!.unit).toBe("l");
    expect(parseVolume("33 cl")!.amount).toBeCloseTo(0.33, 5);
  });

  it("parses Swedish decimal comma for litres", () => {
    expect(parseVolume("1,5 l")).toEqual({ amount: 1.5, unit: "l" });
    expect(parseVolume("0,5 l")).toEqual({ amount: 0.5, unit: "l" });
  });

  it("parses decimal point for litres", () => {
    expect(parseVolume("1.5 l")).toEqual({ amount: 1.5, unit: "l" });
  });

  // ── Kilograms ──────────────────────────────────────────────────────────────

  it("parses kilograms", () => {
    expect(parseVolume("1 kg")).toEqual({ amount: 1, unit: "kg" });
    expect(parseVolume("2 kg")).toEqual({ amount: 2, unit: "kg" });
  });

  it("parses 'kilo' alias", () => {
    expect(parseVolume("1 kilo")).toEqual({ amount: 1, unit: "kg" });
  });

  it("parses grams and converts to kilograms", () => {
    expect(parseVolume("500 g")).toEqual({ amount: 0.5, unit: "kg" });
    expect(parseVolume("400 g")).toEqual({ amount: 0.4, unit: "kg" });
    expect(parseVolume("100 g")).toEqual({ amount: 0.1, unit: "kg" });
    expect(parseVolume("1000 g")).toEqual({ amount: 1, unit: "kg" });
  });

  it("parses 'gram' alias", () => {
    expect(parseVolume("250 gram")).toEqual({ amount: 0.25, unit: "kg" });
  });

  it("parses hectograms and converts to kilograms", () => {
    expect(parseVolume("5 hg")).toEqual({ amount: 0.5, unit: "kg" });
  });

  it("parses Swedish decimal comma for weight", () => {
    expect(parseVolume("1,5 kg")).toEqual({ amount: 1.5, unit: "kg" });
  });

  // ── Count ──────────────────────────────────────────────────────────────────

  it("parses 'st' (styck)", () => {
    expect(parseVolume("6 st")).toEqual({ amount: 6, unit: "st" });
    expect(parseVolume("1 st")).toEqual({ amount: 1, unit: "st" });
  });

  it("parses 'stk' alias", () => {
    expect(parseVolume("4 stk")).toEqual({ amount: 4, unit: "st" });
  });

  it("parses 'pack' alias", () => {
    expect(parseVolume("1 pack")).toEqual({ amount: 1, unit: "st" });
  });

  it("parses 'förp' alias", () => {
    expect(parseVolume("1 förp")).toEqual({ amount: 1, unit: "st" });
  });

  // ── ca. prefix ─────────────────────────────────────────────────────────────

  it("ignores 'ca' prefix", () => {
    expect(parseVolume("ca 500 g")).toEqual({ amount: 0.5, unit: "kg" });
    expect(parseVolume("ca. 1 l")).toEqual({ amount: 1, unit: "l" });
    expect(parseVolume("ca.1 l")).toEqual({ amount: 1, unit: "l" });
  });

  // ── Case insensitivity ─────────────────────────────────────────────────────

  it("is case-insensitive", () => {
    expect(parseVolume("500 ML")).toEqual({ amount: 0.5, unit: "l" });
    expect(parseVolume("1 KG")).toEqual({ amount: 1, unit: "kg" });
    expect(parseVolume("1 L")).toEqual({ amount: 1, unit: "l" });
  });

  // ── Extra whitespace ───────────────────────────────────────────────────────

  it("handles extra whitespace", () => {
    expect(parseVolume("  1  l  ")).toEqual({ amount: 1, unit: "l" });
    expect(parseVolume("500  ml")).toEqual({ amount: 0.5, unit: "l" });
  });

  // ── Unparseable inputs → null ──────────────────────────────────────────────

  it("returns null for empty string", () => {
    expect(parseVolume("")).toBeNull();
  });

  it("returns null for unknown units", () => {
    expect(parseVolume("500 xyz")).toBeNull();
    expect(parseVolume("1 portion")).toBeNull();
  });

  it("returns null for strings with no number", () => {
    expect(parseVolume("ett kilo")).toBeNull();
  });

  it("returns null for zero amount", () => {
    expect(parseVolume("0 l")).toBeNull();
    expect(parseVolume("0 kg")).toBeNull();
  });

  it("returns null for free-text values", () => {
    expect(parseVolume("Passar 4 pers")).toBeNull();
    expect(parseVolume("6-pack")).toBeNull();
  });
});

describe("pricePerUnit", () => {
  it("computes kr/l for a litre product", () => {
    const result = pricePerUnit(18, "1 l");
    expect(result).toEqual({ value: 18, unit: "l" });
  });

  it("computes kr/l for a 1.5 l bottle", () => {
    const result = pricePerUnit(25, "1,5 l");
    expect(result!.unit).toBe("l");
    expect(result!.value).toBeCloseTo(16.67, 2);
  });

  it("computes kr/l for millilitre product", () => {
    const result = pricePerUnit(5, "330 ml");
    expect(result!.unit).toBe("l");
    expect(result!.value).toBeCloseTo(15.15, 2);
  });

  it("computes kr/kg for a gram product", () => {
    const result = pricePerUnit(15, "500 g");
    expect(result).toEqual({ value: 30, unit: "kg" });
  });

  it("computes kr/kg for a kg product", () => {
    const result = pricePerUnit(40, "2 kg");
    expect(result).toEqual({ value: 20, unit: "kg" });
  });

  it("computes kr/st for a count product", () => {
    const result = pricePerUnit(30, "6 st");
    expect(result).toEqual({ value: 5, unit: "st" });
  });

  it("returns null for unparseable volume", () => {
    expect(pricePerUnit(10, "")).toBeNull();
    expect(pricePerUnit(10, "portion")).toBeNull();
  });

  it("reflects effective (sale) price rather than regular price", () => {
    // Caller is responsible for passing effectivePrice; this just verifies the maths
    const regular = pricePerUnit(20, "1 l");
    const sale = pricePerUnit(15, "1 l");
    expect(sale!.value).toBeLessThan(regular!.value);
  });
});
