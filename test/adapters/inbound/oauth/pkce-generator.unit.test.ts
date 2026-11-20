import { PkceGenerator } from "../../../../src/adapters/inbound/oauth/pkce-generator";

const SHA_256 = "SHA-256";
const MIN_VERIFIER = 43;
const MAX_VERIFIER = 128;
const UNRESERVED = /^[A-Za-z0-9._~-]+$/;

async function s256(verifier: string): Promise<string> {
    const digest = await crypto.subtle.digest(SHA_256, new TextEncoder().encode(verifier));
    return Buffer.from(digest).toString("base64url");
}

describe("PkceGenerator", () => {
    it("derives the challenge from the verifier with S256", async () => {
        const pair = await new PkceGenerator().create();

        expect(pair.challenge).toBe(await s256(pair.verifier));
    });

    it("makes a verifier of allowed length and characters", async () => {
        const { verifier } = await new PkceGenerator().create();

        expect([verifier.length >= MIN_VERIFIER, verifier.length <= MAX_VERIFIER, UNRESERVED.test(verifier)]).toEqual([
            true,
            true,
            true,
        ]);
    });

    it("makes a new verifier each time", async () => {
        const generator = new PkceGenerator();

        const [first, second] = await Promise.all([generator.create(), generator.create()]);

        expect(first.verifier).not.toBe(second.verifier);
    });
});
