/**
 * Small isomorphic random-id generator (works in the browser and on the server).
 *
 * Produces a short, URL-safe base62 string. Used as the candidate id, which
 * doubles as the (unguessable) interview-link parameter, so links stay short:
 *   /interview?c=Xa9bC2dEf3Gh
 */
const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export function newId(bytes = 9): string {
  const arr = new Uint8Array(bytes);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  let n = 0n;
  for (const b of arr) n = (n << 8n) | BigInt(b);
  if (n === 0n) return "0";
  let out = "";
  while (n > 0n) {
    out = ALPHABET[Number(n % 62n)] + out;
    n /= 62n;
  }
  return out;
}
