import type { ConsentDescription } from "@cloudflare/workers-oauth-provider";

const SPECIAL_CHARACTERS = /[&<>"']/g;
const LOOPBACK_WARNING =
  "<p><strong>This sends access to an app on your computer.</strong> Continue only if you just started signing in from it.</p>";
const NO_WARNING = "";
const STYLE =
  "body{font-family:system-ui,sans-serif;max-width:32rem;margin:3rem auto;padding:0 1rem;line-height:1.5}button{font-size:1rem;padding:.5rem 1rem;margin-right:.5rem}";

export class SignInPages {
  consent(details: ConsentDescription, handle: string): string {
    const name = this.escape(details.clientName);
    const warning = details.redirectIsLoopback ? LOOPBACK_WARNING : NO_WARNING;
    return this.page(
      `Allow ${name}?`,
      `<h1>Allow ${name} to use your second brain?</h1>
<p>It will read and change your notes. Access will be sent to <strong>${this.escape(details.redirectHost)}</strong>.</p>
${warning}
<p>You will sign in with GitHub next. Only the owner's account is accepted.</p>
<form method="post">
<input type="hidden" name="handle" value="${this.escape(handle)}">
<button name="decision" value="approve">Allow and sign in with GitHub</button>
<button name="decision" value="deny">Deny</button>
</form>`,
    );
  }

  refused(): string {
    return this.page(
      "Access refused",
      "<h1>Access refused</h1><p>Only the owner of this second brain can sign in. You can close this page.</p>",
    );
  }

  failed(message: string): string {
    return this.page(
      "Sign-in failed",
      `<h1>Sign-in failed</h1><p>${this.escape(message)}</p><p>Start signing in again from your app.</p>`,
    );
  }

  private page(title: string, body: string): string {
    return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>${STYLE}</style>
${body}
</html>`;
  }

  private escape(value: string): string {
    return value.replace(SPECIAL_CHARACTERS, (char) => `&#${char.charCodeAt(0)};`);
  }
}
