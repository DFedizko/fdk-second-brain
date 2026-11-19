const WHITESPACE = /\s/g;
const UTF8 = "utf-8";
const KEEP_BOM = { ignoreBOM: true };

export function encodeBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
}

export function decodeBase64(encoded: string, strict = true): string {
  const binary = atob(encoded.replace(WHITESPACE, ""));
  return new TextDecoder(UTF8, { ...KEEP_BOM, fatal: strict }).decode(
    Uint8Array.from(binary, (char) => char.charCodeAt(0)),
  );
}
