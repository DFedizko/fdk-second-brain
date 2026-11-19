const WHITESPACE = /\s/g;

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

export function decodeBase64(encoded: string): string {
  const binary = atob(encoded.replace(WHITESPACE, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}
