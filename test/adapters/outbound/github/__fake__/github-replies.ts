import type { components } from "@octokit/openapi-types";

type BasicError = components["schemas"]["basic-error"];

const DOCS = "https://docs.github.com/rest";
const JSON_TYPE = "application/json; charset=utf-8";
const MEDIA_TYPE = "github.v3; format=json";

export const STATUS = {
  ok: 200,
  created: 201,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  conflict: 409,
  unprocessable: 422,
  tooManyRequests: 429,
  serverError: 500,
} as const;

export const DOCS_PAGE = {
  contents: `${DOCS}/repos/contents`,
  refs: `${DOCS}/git/refs`,
  trees: `${DOCS}/git/trees`,
  commits: `${DOCS}/git/commits`,
  blobs: `${DOCS}/git/blobs`,
  rateLimits: `${DOCS}/using-the-rest-api/rate-limits-for-the-rest-api`,
  root: DOCS,
} as const;

export const MESSAGE = {
  badCredentials: "Bad credentials",
  notFound: "Not Found",
  shaMissing: 'Invalid request.\n\n"sha" wasn\'t supplied.',
  notFastForward: "Update is not a fast forward",
  rateLimited: "API rate limit exceeded for user ID 1.",
  secondaryLimit:
    "You have exceeded a secondary rate limit. Please wait a few minutes before you try again.",
  noPermission: "Resource not accessible by personal access token",
  serverError: "Server Error",
  invalidTree: "Invalid tree info",
  noTree: "Tree SHA does not exist",
  noParent: "Parent SHA does not exist or is not a commit object",
  noReference: "Reference does not exist",
  noObject: "Object does not exist",
  emptyRepo: "Git Repository is empty.",
  refExists: "Reference already exists",
  emptyContents: "This repository is empty.",
} as const;

export class GitHubReplies {
  json(status: number, body: unknown, headers: Headers): Response {
    headers.set("content-type", JSON_TYPE);
    headers.set("x-github-media-type", MEDIA_TYPE);
    return new Response(JSON.stringify(body), { status, headers });
  }

  error(status: number, message: string, docs: string, headers: Headers): Response {
    const body: BasicError = { message, documentation_url: docs, status: String(status) };
    return this.json(status, body, headers);
  }
}
