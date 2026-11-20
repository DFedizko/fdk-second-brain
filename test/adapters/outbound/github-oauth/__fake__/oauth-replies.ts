const TOKEN_ERRORS_DOCS =
  "/apps/managing-oauth-apps/troubleshooting-oauth-app-access-token-request-errors/";
const AUTHORIZE_ERRORS_DOCS =
  "/apps/building-integrations/setting-up-and-registering-oauth-apps/troubleshooting-authorization-request-errors/";
const JSON_TYPE = "application/json; charset=utf-8";
const FORM_TYPE = "application/x-www-form-urlencoded; charset=utf-8";
const WANTS_JSON = "application/json";
const OK = 200;
const FOUND = 302;
const NOT_FOUND = 404;

export const TOKEN_ERROR = {
  badCode: {
    error: "bad_verification_code",
    error_description: "The code passed is incorrect or expired.",
    error_uri: `${TOKEN_ERRORS_DOCS}#bad-verification-code`,
  },
  badClient: {
    error: "incorrect_client_credentials",
    error_description: "The client_id and/or client_secret passed are incorrect.",
    error_uri: `${TOKEN_ERRORS_DOCS}#incorrect-client-credentials`,
  },
  redirectMismatch: {
    error: "redirect_uri_mismatch",
    error_description:
      "The redirect_uri MUST match the registered callback URL for this application.",
    error_uri: `${AUTHORIZE_ERRORS_DOCS}#redirect-uri-mismatch2`,
  },
} as const;

export const ACCESS_DENIED = {
  error: "access_denied",
  error_description: "The user has denied your application access.",
  error_uri: `${AUTHORIZE_ERRORS_DOCS}#access-denied`,
} as const;

export const APP_SUSPENDED = {
  error: "application_suspended",
  error_description: "Your application has been suspended. Contact support@github.com.",
  error_uri: `${AUTHORIZE_ERRORS_DOCS}#application-suspended`,
} as const;

export type TokenReply = Readonly<Record<string, string>>;

export class OAuthReplies {
  token(request: Request, body: TokenReply): Response {
    const wantsJson = request.headers.get("accept")?.includes(WANTS_JSON) ?? false;
    const text = wantsJson ? JSON.stringify(body) : new URLSearchParams(body).toString();
    const type = wantsJson ? JSON_TYPE : FORM_TYPE;
    return new Response(text, { status: OK, headers: { "content-type": type } });
  }

  redirect(target: string, params: TokenReply): Response {
    const url = new URL(target);
    Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value));
    return new Response(null, { status: FOUND, headers: { location: url.toString() } });
  }

  notFound(): Response {
    return new Response("Not Found", { status: NOT_FOUND });
  }
}
