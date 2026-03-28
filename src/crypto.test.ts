import { describe, it, expect } from "vitest";
import { pbkdf2Sync, createDecipheriv } from "node:crypto";
import { encryptCredential } from "./crypto.js";

function decrypt(key: string, str: string): string {
  const combined = Buffer.from(str, "base64").toString("utf8");
  const [ivHex, saltHex, ciphertextB64] = combined.split("::");
  const iv = Buffer.from(ivHex, "hex");
  const salt = Buffer.from(saltHex, "hex");
  const ciphertext = Buffer.from(ciphertextB64, "base64");
  const derivedKey = pbkdf2Sync(key, salt, 1000, 16, "sha1");
  const decipher = createDecipheriv("aes-128-cbc", derivedKey, iv);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

describe("encryptCredential", () => {
  it("returns an object with key and str strings", () => {
    const result = encryptCredential("test");
    expect(result).toHaveProperty("key");
    expect(result).toHaveProperty("str");
    expect(typeof result.key).toBe("string");
    expect(typeof result.str).toBe("string");
  });

  it("produces a 16-digit numeric key", () => {
    const { key } = encryptCredential("test");
    expect(key).toMatch(/^\d{16}$/);
  });

  it("produces a valid base64 str with iv::salt::ciphertext structure", () => {
    const { str } = encryptCredential("test");
    const combined = Buffer.from(str, "base64").toString("utf8");
    const parts = combined.split("::");
    expect(parts).toHaveLength(3);

    const [ivHex, saltHex, ciphertextB64] = parts;
    // IV: 16 bytes = 32 hex chars
    expect(ivHex).toMatch(/^[0-9a-f]{32}$/);
    // Salt: 16 bytes = 32 hex chars
    expect(saltHex).toMatch(/^[0-9a-f]{32}$/);
    // Ciphertext: valid base64
    expect(() => Buffer.from(ciphertextB64, "base64")).not.toThrow();
    expect(Buffer.from(ciphertextB64, "base64").length).toBeGreaterThan(0);
  });

  it("round-trips back to the original plaintext", () => {
    const plaintext = "mySecretPassword123";
    const { key, str } = encryptCredential(plaintext);
    expect(decrypt(key, str)).toBe(plaintext);
  });

  it("round-trips unicode input", () => {
    const plaintext = "lösenord med åäö";
    const { key, str } = encryptCredential(plaintext);
    expect(decrypt(key, str)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const { key, str } = encryptCredential("");
    expect(decrypt(key, str)).toBe("");
  });

  it("produces different output on each call", () => {
    const a = encryptCredential("same");
    const b = encryptCredential("same");
    expect(a.key).not.toBe(b.key);
    expect(a.str).not.toBe(b.str);
  });
});
