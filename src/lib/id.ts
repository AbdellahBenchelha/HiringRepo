/**
 * Small isomorphic random-id generator (works in the browser and on the server).
 * Used to give every candidate a stable unique id.
 */
export function newId(bytes = 12): string {
  const arr = new Uint8Array(bytes);
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.getRandomValues === "function") {
    c.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}
