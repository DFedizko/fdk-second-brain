import type { ConsentDescription } from "@cloudflare/workers-oauth-provider";
import { SignInPages } from "../../../../src/adapters/inbound/oauth/sign-in-pages";

const HANDLE = "consent-handle-123";
const DETAILS: ConsentDescription = {
  clientId: "client-1",
  clientName: "Claude",
  redirectUri: "https://claude.ai/api/mcp/auth_callback",
  redirectHost: "claude.ai",
  redirectIsLoopback: false,
  scope: [],
};
const HOSTILE_NAME = `<script>alert("x")</script>`;
const LOOPBACK_WARNING = "an app on your computer";

describe("SignInPages", () => {
  it("names the client asking for access", () => {
    const html = new SignInPages().consent(DETAILS, HANDLE);

    expect(html).toContain("Claude");
  });

  it("shows where access will be sent", () => {
    const html = new SignInPages().consent(DETAILS, HANDLE);

    expect(html).toContain("<strong>claude.ai</strong>");
  });

  it("posts the consent handle back", () => {
    const html = new SignInPages().consent(DETAILS, HANDLE);

    expect(html).toContain(`name="handle" value="${HANDLE}"`);
  });

  it("offers to allow and to deny", () => {
    const html = new SignInPages().consent(DETAILS, HANDLE);

    expect([html.includes(`value="approve"`), html.includes(`value="deny"`)]).toEqual([true, true]);
  });

  it("escapes what the client chose about itself", () => {
    const html = new SignInPages().consent({ ...DETAILS, clientName: HOSTILE_NAME }, HANDLE);

    expect(html).not.toContain(HOSTILE_NAME);
  });

  it("warns when access goes to an app on this computer", () => {
    const local = { ...DETAILS, redirectHost: "localhost", redirectIsLoopback: true };

    const html = new SignInPages().consent(local, HANDLE);

    expect(html).toContain(LOOPBACK_WARNING);
  });

  it("does not warn for a remote app", () => {
    const html = new SignInPages().consent(DETAILS, HANDLE);

    expect(html).not.toContain(LOOPBACK_WARNING);
  });

  it("explains that only the owner may sign in", () => {
    const html = new SignInPages().refused();

    expect(html).toContain("Only the owner");
  });

  it("escapes the message of a failure page", () => {
    const html = new SignInPages().failed(HOSTILE_NAME);

    expect(html).not.toContain(HOSTILE_NAME);
  });
});
