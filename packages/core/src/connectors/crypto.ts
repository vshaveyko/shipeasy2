// AES-GCM encryption helpers for connector OAuth credentials.
// Uses the Web Crypto API (available on Cloudflare Workers + Node 20).

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(secret: string): Promise<CryptoKey> {
  // Hash the user-provided secret to a 256-bit AES key (deterministic).
  const raw = new TextEncoder().encode(secret);
  const hash = await crypto.subtle.digest("SHA-256", raw);
  return crypto.subtle.importKey("raw", hash, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptJSON(value: unknown, secret: string): Promise<string> {
  const key = await deriveKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      plaintext as BufferSource,
    ),
  );
  return `v1.${b64url(iv)}.${b64url(ct)}`;
}

export async function decryptJSON<T = unknown>(cipher: string, secret: string): Promise<T> {
  const [version, ivPart, ctPart] = cipher.split(".");
  if (version !== "v1") throw new Error("Unsupported cipher version");
  const key = await deriveKey(secret);
  const pt = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64url(ivPart) as BufferSource },
      key,
      fromB64url(ctPart) as BufferSource,
    ),
  );
  return JSON.parse(new TextDecoder().decode(pt)) as T;
}
