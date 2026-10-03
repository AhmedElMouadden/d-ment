import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./crypto";

const key = randomBytes(32).toString("base64");

describe("chiffrement des jetons", () => {
  it("chiffre puis déchiffre", () => {
    const token = "eyJlbmMiOiJBMTI4Q0JDLUhTMjU2IiwiYWxnIjoiZGlyIn0..secret";
    const enc = encryptSecret(token, key);
    expect(enc).not.toContain("secret");
    expect(enc.startsWith("v1.")).toBe(true);
    expect(decryptSecret(enc, key)).toBe(token);
  });

  it("produit un résultat différent à chaque fois (IV aléatoire)", () => {
    expect(encryptSecret("abc", key)).not.toBe(encryptSecret("abc", key));
  });

  it("refuse un texte modifié ou une mauvaise clé", () => {
    const enc = encryptSecret("abc", key);
    const parts = enc.split(".");
    parts[3] = Buffer.from("xyz").toString("base64url");
    expect(() => decryptSecret(parts.join("."), key)).toThrow();
    expect(() => decryptSecret(enc, randomBytes(32).toString("base64"))).toThrow();
  });

  it("refuse une clé de mauvaise taille", () => {
    expect(() => encryptSecret("abc", randomBytes(16).toString("base64"))).toThrow(/32 octets/);
  });
});
