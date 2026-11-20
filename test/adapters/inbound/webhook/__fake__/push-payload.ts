import type { components } from "@octokit/openapi-types";

// Shapes from https://docs.github.com/en/webhooks/webhook-events-and-payloads#push
// and @octokit/openapi-types "webhook-push", checked 2026-11-19.

export type WebhookPush = components["schemas"]["webhook-push"];
export type PushCommit = WebhookPush["commits"][number];

export interface FileChanges {
  readonly added?: readonly string[];
  readonly modified?: readonly string[];
  readonly removed?: readonly string[];
}

export interface PushSpec {
  readonly branch: string;
  readonly commits: readonly FileChanges[];
  readonly forced?: boolean;
  readonly deleted?: boolean;
}

const OWNER = "octo-cat";
const REPO = "second-brain.notes";
const BEFORE = "6113728f27ae82c7b1a177c8d03f9e96e0adf246";
const AFTER = "0d1a26e67d8f5eaf1f6ba5c57fc3c7d91ac0fd1c";
const TREE = "f9d2a07e9488b91af2641b26b9407fe22a451433";
const TIMESTAMP = "2026-11-19T12:00:00-03:00";
const AUTHOR = { name: "Octo Cat", email: "octocat@github.com", username: OWNER };
const SHA_LENGTH = 40;
const HEX_RADIX = 16;
const PAD = "0";
const SENDER_ID = 583231;

type PushFields = Omit<WebhookPush, "repository" | "sender" | "pusher">;

export interface PushPayload extends PushFields {
  readonly repository: { readonly full_name: string; readonly name: string };
  readonly pusher: { readonly name: string; readonly email: string };
  readonly sender: { readonly login: string; readonly id: number; readonly type: string };
}

export function buildPushPayload(spec: PushSpec): PushPayload {
  const commits = spec.commits.map((changes, place) => buildCommit(changes, place));
  return {
    ref: `refs/heads/${spec.branch}`,
    before: BEFORE,
    after: spec.deleted ? PAD.repeat(SHA_LENGTH) : AFTER,
    base_ref: null,
    created: false,
    deleted: spec.deleted ?? false,
    forced: spec.forced ?? false,
    compare: `https://github.com/${OWNER}/${REPO}/compare/${BEFORE.slice(0, 12)}...${AFTER.slice(0, 12)}`,
    commits,
    head_commit: commits.at(-1) ?? null,
    repository: { full_name: `${OWNER}/${REPO}`, name: REPO },
    pusher: { name: OWNER, email: AUTHOR.email },
    sender: { login: OWNER, id: SENDER_ID, type: "User" },
  };
}

function buildCommit(changes: FileChanges, place: number): PushCommit {
  const id = place.toString(HEX_RADIX).padStart(SHA_LENGTH, PAD);
  return {
    id,
    tree_id: TREE,
    distinct: true,
    message: `Edit notes (${place})`,
    timestamp: TIMESTAMP,
    url: `https://github.com/${OWNER}/${REPO}/commit/${id}`,
    author: AUTHOR,
    committer: AUTHOR,
    added: [...(changes.added ?? [])],
    removed: [...(changes.removed ?? [])],
    modified: [...(changes.modified ?? [])],
  };
}
