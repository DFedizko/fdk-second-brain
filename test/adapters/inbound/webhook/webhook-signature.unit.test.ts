import { WebhookSignature } from "../../../../src/adapters/inbound/webhook/webhook-signature";

const DOCS_SECRET = "It's a Secret to Everybody";
const DOCS_TEXT = "Hello, World!";
const DOCS_PAYLOAD = new TextEncoder().encode(DOCS_TEXT);
const DOCS_SIGNATURE = "sha256=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";
const OTHER_SIGNATURE = "sha256=0000000000000000000000000000000000000000000000000000000000000000";
const WRONG_SCHEME = "sha1=757107ea0eb2509fc211221cce984b8a37570b6d7586c22c46f4379c8b043e17";
const NOT_HEX = "sha256=not-a-hex-digest";

describe("WebhookSignature", () => {
    const signature = new WebhookSignature({ secret: DOCS_SECRET });

    it("accepts the signature GitHub's docs give for their sample payload", async () => {
        const valid = await signature.verify(DOCS_PAYLOAD, DOCS_SIGNATURE);

        expect(valid).toBe(true);
    });

    it("rejects a signature made with another secret", async () => {
        const valid = await signature.verify(DOCS_PAYLOAD, OTHER_SIGNATURE);

        expect(valid).toBe(false);
    });

    it("rejects a payload changed after signing", async () => {
        const valid = await signature.verify(new TextEncoder().encode(`${DOCS_TEXT}!`), DOCS_SIGNATURE);

        expect(valid).toBe(false);
    });

    it("rejects a missing signature", async () => {
        const valid = await signature.verify(DOCS_PAYLOAD, null);

        expect(valid).toBe(false);
    });

    it("rejects a signature without the sha256 prefix", async () => {
        const valid = await signature.verify(DOCS_PAYLOAD, WRONG_SCHEME);

        expect(valid).toBe(false);
    });

    it("rejects a signature that is not hexadecimal", async () => {
        const valid = await signature.verify(DOCS_PAYLOAD, NOT_HEX);

        expect(valid).toBe(false);
    });
});
