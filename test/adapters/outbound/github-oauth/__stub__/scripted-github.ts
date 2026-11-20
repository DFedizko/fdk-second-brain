import type { HttpFetch } from "../../../../../src/adapters/outbound/github-oauth/github-identity";

const TOKEN_PATH = "/login/oauth/access_token";
const OK = 200;

export function scriptedGitHub(tokenReply: unknown, userReply: unknown): HttpFetch {
  return (input) => {
    const isToken = new URL(input).pathname === TOKEN_PATH;
    const body = JSON.stringify(isToken ? tokenReply : userReply);
    return Promise.resolve(new Response(body, { status: OK }));
  };
}
