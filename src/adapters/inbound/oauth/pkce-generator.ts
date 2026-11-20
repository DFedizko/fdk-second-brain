export interface PkcePair {
    readonly verifier: string;
    readonly challenge: string;
}

export interface PkceSource {
    create(): Promise<PkcePair>;
}

const VERIFIER_BYTES = 32;
const SHA_256 = "SHA-256";

export class PkceGenerator implements PkceSource {
    async create(): Promise<PkcePair> {
        const verifier = this.encode(crypto.getRandomValues(new Uint8Array(VERIFIER_BYTES)));
        const digest = await crypto.subtle.digest(SHA_256, new TextEncoder().encode(verifier));
        return { verifier, challenge: this.encode(new Uint8Array(digest)) };
    }

    private encode(bytes: Uint8Array): string {
        return bytes.toBase64({ alphabet: "base64url", omitPadding: true });
    }
}
