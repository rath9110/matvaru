"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encryptCredential = encryptCredential;
var node_crypto_1 = require("node:crypto");
/**
 * Encrypts a credential string using AES-128-CBC with PBKDF2 key derivation.
 * This replicates the client-side encryption used by the Willys website
 * (module 89683 in their JS bundle).
 *
 * Algorithm:
 * 1. Generate random 16-byte IV and 16-byte salt
 * 2. Generate random 16-digit numeric key string
 * 3. Derive AES-128-CBC key using PBKDF2 (SHA-1, 1000 iterations)
 * 4. Encrypt plaintext with AES-128-CBC
 * 5. Return { key, str: base64(hex(iv) + "::" + hex(salt) + "::" + base64(ciphertext)) }
 */
function encryptCredential(plaintext) {
    var iv = (0, node_crypto_1.randomBytes)(16);
    var salt = (0, node_crypto_1.randomBytes)(16);
    // Generate a random 16-digit numeric key (like the JS: two 8-digit random number strings)
    var key = Math.random().toString().substring(2, 10) +
        Math.random().toString().substring(2, 10);
    // Derive AES key using PBKDF2
    var derivedKey = (0, node_crypto_1.pbkdf2Sync)(key, salt, 1000, 16, "sha1");
    // Encrypt with AES-128-CBC
    var cipher = (0, node_crypto_1.createCipheriv)("aes-128-cbc", derivedKey, iv);
    var encrypted = Buffer.concat([
        cipher.update(plaintext, "utf8"),
        cipher.final(),
    ]);
    // Format: base64(hex(iv) + "::" + hex(salt) + "::" + base64(ciphertext))
    var combined = "".concat(iv.toString("hex"), "::").concat(salt.toString("hex"), "::").concat(encrypted.toString("base64"));
    var str = Buffer.from(combined).toString("base64");
    return { key: key, str: str };
}
