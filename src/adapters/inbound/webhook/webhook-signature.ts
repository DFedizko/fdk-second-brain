import type { WebhookSettings } from "../../../shared/contracts/webhook-settings";

const PREFIX = "sha256=";
const HEX_DIGEST = /^[0-9a-f]{64}$/;
const HEX_PAIR = /../g;
const HEX_RADIX = 16;
const HMAC = { name: "HMAC", hash: "SHA-256" } as const;
const VERIFY: ["verify"] = ["verify"];
const RAW = "raw";

export interface SignatureCheck {
    verify(payload: BufferSource, header: string | null): Promise<boolean>;
}

export class WebhookSignature implements SignatureCheck {
    private key?: Promise<CryptoKey>;

    constructor(private readonly settings: WebhookSettings) {}

    async verify(payload: BufferSource, header: string | null): Promise<boolean> {
        const digest = this.readDigest(header);
        if (digest === null) return false;
        return crypto.subtle.verify(HMAC, await this.importKey(), digest, payload);
    }

    private readDigest(header: string | null): Uint8Array<ArrayBuffer> | null {
        if (header === null || !header.startsWith(PREFIX)) return null;
        const hex = header.slice(PREFIX.length);
        if (!HEX_DIGEST.test(hex)) return null;
        return Uint8Array.from(hex.match(HEX_PAIR) ?? [], (pair) => parseInt(pair, HEX_RADIX));
    }

    private importKey(): Promise<CryptoKey> {
        this.key ??= this.createKey();
        return this.key;
    }

    private createKey(): Promise<CryptoKey> {
        const secret = new TextEncoder().encode(this.settings.secret);
        return crypto.subtle.importKey(RAW, secret, HMAC, false, VERIFY);
    }
}
